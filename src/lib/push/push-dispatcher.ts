import type { DbClient } from "@/lib/infra/postgres/client";
import type { PostCommitConsumer } from "@/lib/events/post-commit-publisher";
import type { RealtimeDomainEvent } from "@/lib/realtime/contracts";
import { sendWebPushNotification, type WebPushNotificationPayload } from "@/lib/push/vapid-sender";

export type StoredPushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export class PushDispatcher implements PostCommitConsumer {
  constructor(private readonly db: DbClient | ((...args: unknown[]) => unknown)) {}

  async consume(event: RealtimeDomainEvent): Promise<void> {
    if (event.type !== "message.created") return;

    const { conversation_id, message, event_id } = event;
    const senderId = message.sender_id;

    try {
      const sql = this.db as unknown as DbClient;
      // 1. Fetch conversation members excluding sender, respecting mute status
      const members = await sql<{ user_id: string; muted: boolean }[]>`
        SELECT user_id, muted
        FROM public.conversation_members
        WHERE conversation_id = ${conversation_id}
          AND user_id != ${senderId}
      `;

      if (!members || !members.length) return;

      // Filter out muted members
      const activeMemberIds = members.filter((m) => !m.muted).map((m) => m.user_id);
      if (!activeMemberIds.length) return;

      // 2. Fetch push subscriptions for active members early to avoid redundant queries
      const subscriptions = await sql<StoredPushSubscription[]>`
        SELECT id, user_id, endpoint, p256dh, auth
        FROM public.push_subscriptions
        WHERE user_id = ANY(${activeMemberIds})
      `;

      if (!subscriptions || !subscriptions.length) return;

      // Filter out blocked users among those with subscriptions
      const targetUserIds = Array.from(new Set(subscriptions.map((s) => s.user_id)));
      const blocked = await sql<{ id: string }[]>`
        SELECT requester_id AS id FROM public.friendships
        WHERE addressee_id = ${senderId} AND status = 'blocked'
          AND requester_id = ANY(${targetUserIds})
        UNION
        SELECT addressee_id AS id FROM public.friendships
        WHERE requester_id = ${senderId} AND status = 'blocked'
          AND addressee_id = ANY(${targetUserIds})
      `;
      const blockedIds = new Set((blocked || []).map((b) => b.id));
      const eligibleSubscriptions = subscriptions.filter((s) => !blockedIds.has(s.user_id));
      if (!eligibleSubscriptions.length) return;

      // 3. Verify VAPID configuration
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      const subject = process.env.VAPID_SUBJECT || "mailto:admin@ghostline.app";

      if (!publicKey || !privateKey) {
        // VAPID keys not configured in environment — skip push silently
        return;
      }

      // Minimal privacy-preserving payload (Model A generic push: 0% plaintext/metadata exposure)
      const payload: WebPushNotificationPayload = {
        title: "New message",
        body: "New message in Ghostline",
        notificationId: event_id,
      };

      // 4. Dispatch push notifications in parallel with failure isolation
      await Promise.allSettled(
        eligibleSubscriptions.map(async (sub) => {
          const res = await sendWebPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            { publicKey, privateKey, subject }
          );

          // Clean up permanently expired/invalid subscriptions (404 or 410)
          if (res.removeSubscription) {
            try {
              await sql`
                DELETE FROM public.push_subscriptions
                WHERE endpoint = ${sub.endpoint}
              `;
            } catch (err) {
              console.error("[PUSH_CLEANUP_ERROR]", err);
            }
          }
        })
      );
    } catch (error) {
      console.error("[PUSH_DISPATCHER_ERROR]", error);
    }
  }
}
