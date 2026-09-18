// @ts-nocheck
import { describe, it, expect, beforeEach } from "vitest";
import { MessageService } from "@/lib/services/message.service";
import { AuthorizationError, NotFoundError, RateLimitError } from "@/lib/domain/errors";
import type { MessageRepository, ConversationRepository, ProfileRepository } from "@/lib/repositories/ports";
import type { Message } from "@/lib/domain/types";
import type { RateLimiter } from "@/lib/ports/rate-limit";

describe("MessageService", () => {
  const currentUserId = "user-1111-1111";
  const otherUserId = "user-2222-2222";
  const convId = "conv-aaaa-aaaa";

  let messagesStore: Message[];
  let hiddenStore: Array<{ userId: string; messageId: string }>;
  let deliveredReceipts: Array<{ userId: string; messageIds: string[]; at: string }>;
  let rateLimitHitCount: number;

  let mockMessagesRepo: Partial<MessageRepository>;
  let mockConversationsRepo: Partial<ConversationRepository>;
  let mockProfilesRepo: Partial<ProfileRepository>;
  let mockRateLimiter: RateLimiter;
  let service: MessageService;

  beforeEach(() => {
    messagesStore = [
      {
        id: "msg-1",
        conversation_id: convId,
        sender_id: currentUserId,
        body: "Hello from current user",
        client_id: "cid-1",
        created_at: "2026-09-01T10:00:00.000Z",
        edited_at: null,
        deleted_at: null,
        reply_to_id: null,
        forwarded_from_id: null,
      },
      {
        id: "msg-2",
        conversation_id: convId,
        sender_id: otherUserId,
        body: "Hello from other user",
        client_id: "cid-2",
        created_at: "2026-09-01T10:01:00.000Z",
        edited_at: null,
        deleted_at: null,
        reply_to_id: null,
        forwarded_from_id: null,
      },
    ];
    hiddenStore = [];
    deliveredReceipts = [];
    rateLimitHitCount = 0;

    mockMessagesRepo = {
      list: async (_convId, opts) => {
        let list = [...messagesStore];
        if (opts.before) {
          list = list.filter((m) => m.created_at < opts.before!);
        }
        if (opts.after) {
          list = list.filter((m) => m.created_at > opts.after!);
        }
        return list.slice(0, opts.limit);
      },
      markReceiptsDelivered: async (userId, messageIds, at) => {
        deliveredReceipts.push({ userId, messageIds, at });
      },
      getById: async (id) => messagesStore.find((m) => m.id === id) ?? null,
      getByIds: async (ids) => messagesStore.filter((m) => ids.includes(m.id)),
      insert: async (row) => {
        const newMsg: Message = {
          id: `msg-${Date.now()}`,
          conversation_id: row.conversation_id,
          sender_id: row.sender_id,
          body: row.body,
          client_id: row.client_id ?? null,
          created_at: new Date().toISOString(),
          edited_at: null,
          deleted_at: null,
          reply_to_id: row.reply_to_id ?? null,
          forwarded_from_id: row.forwarded_from_id ?? null,
        };
        messagesStore.push(newMsg);
        return newMsg;
      },
      updateBody: async (id, body) => {
        const msg = messagesStore.find((m) => m.id === id);
        if (!msg) throw new NotFoundError("Not found");
        msg.body = body;
        msg.edited_at = new Date().toISOString();
        return msg;
      },
      hardDelete: async (id) => {
        messagesStore = messagesStore.filter((m) => m.id !== id);
      },
      hideForUser: async (userId, messageId) => {
        hiddenStore.push({ userId, messageId });
      },
      listHiddenIds: async (userId, messageIds) => {
        return hiddenStore
          .filter((h) => h.userId === userId && messageIds.includes(h.messageId))
          .map((h) => h.messageId);
      },
      findByClientId: async (_cId, senderId, clientId) => {
        return (
          messagesStore.find((m) => m.sender_id === senderId && m.client_id === clientId) ?? null
        );
      },
      listReceipts: async () => [],
      listEdits: async (messageId: string) => {
        if (messageId === "msg-edited") {
          return [{ previous_body: "Original text", edited_at: "2026-09-01T10:02:00.000Z" }];
        }
        return [];
      },
    };

    mockConversationsRepo = {};
    mockProfilesRepo = {};
    mockRateLimiter = {
      hit: async () => {
        rateLimitHitCount++;
      },
    };

    service = new MessageService(
      currentUserId,
      mockMessagesRepo as MessageRepository,
      mockConversationsRepo as ConversationRepository,
      mockProfilesRepo as ProfileRepository,
      mockRateLimiter,
    );
  });

  it("sends a message and invokes the rate limiter", async () => {
    const msg = await service.send({
      conversation_id: convId,
      body: "Test send message",
      client_id: "test-client-id-123",
    });

    expect(msg.body).toBe("Test send message");
    expect(msg.sender_id).toBe(currentUserId);
    expect(msg.client_id).toBe("test-client-id-123");
    expect(rateLimitHitCount).toBe(1);
    expect(messagesStore).toHaveLength(3);
  });

  it("lists messages and filters out messages hidden by current user", async () => {
    // Hide msg-1 for current user
    hiddenStore.push({ userId: currentUserId, messageId: "msg-1" });

    const result = await service.list(convId, { limit: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("msg-2");
  });

  it("allows sender to edit their own message", async () => {
    const edited = await service.edit("msg-1", "Updated body");
    expect(edited.body).toBe("Updated body");
    expect(edited.edited_at).toBeDefined();
  });

  it("rejects editing a message sent by someone else with AuthorizationError", async () => {
    await expect(service.edit("msg-2", "Hacked body")).rejects.toThrow(AuthorizationError);
  });

  it("rejects editing a nonexistent message with NotFoundError", async () => {
    await expect(service.edit("nonexistent-msg", "Body")).rejects.toThrow(NotFoundError);
  });

  it("allows sender to perform hard delete-for-everyone", async () => {
    const res = await service.deleteForEveryone("msg-1");
    expect(res).toEqual({ ok: true });
    expect(messagesStore.find((m) => m.id === "msg-1")).toBeUndefined();
  });

  it("rejects delete-for-everyone on someone else's message with AuthorizationError", async () => {
    await expect(service.deleteForEveryone("msg-2")).rejects.toThrow(AuthorizationError);
    expect(messagesStore.find((m) => m.id === "msg-2")).toBeDefined();
  });

  it("hides message for the calling user", async () => {
    const res = await service.hide("msg-2");
    expect(res).toEqual({ ok: true });
    expect(hiddenStore).toContainEqual({ userId: currentUserId, messageId: "msg-2" });
  });

  it("propagates RateLimitError when rate limiter throws", async () => {
    mockRateLimiter.hit = async () => {
      throw new RateLimitError("Too many messages");
    };

    await expect(
      service.send({
        conversation_id: convId,
        body: "Spam message",
      }),
    ).rejects.toThrow(RateLimitError);
  });

  it("marks delivery receipts for incoming messages", async () => {
    const res = await service.markDelivered(convId, ["msg-2"]);
    expect(res).toEqual({ ok: true });
    expect(deliveredReceipts).toHaveLength(1);
    expect(deliveredReceipts[0].userId).toBe(currentUserId);
    expect(deliveredReceipts[0].messageIds).toEqual(["msg-2"]);
  });

  it("supports incremental catchup using opts.after", async () => {
    const list = await service.list(convId, {
      after: "2026-09-01T10:00:00.000Z",
      limit: 10,
    });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("msg-2");
  });

  it("allows conversation members to view message edit history", async () => {
    messagesStore.push({
      id: "msg-edited",
      conversation_id: convId,
      sender_id: otherUserId,
      body: "Updated text",
      client_id: "cid-edited",
      created_at: "2026-09-01T10:01:30.000Z",
      edited_at: "2026-09-01T10:02:00.000Z",
      deleted_at: null,
      reply_to_id: null,
      forwarded_from_id: null,
    });

    const edits = await service.listEdits("msg-edited");
    expect(edits).toHaveLength(1);
    expect(edits[0].previous_body).toBe("Original text");
  });
});
