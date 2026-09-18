import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireNotFrozen } from "@/lib/infra/write-gate";
import type { AppSupabase } from "@/lib/infra/supabase/app-client";
import { getPostgresClient } from "@/lib/infra/postgres/client";
import { PostgresPrekeyRepository } from "@/lib/repositories/postgres/postgres-prekey-repository";
import { PostgresDeviceRepository } from "@/lib/repositories/postgres/postgres-device-call-repository";
import { SupabasePrekeyRepository } from "@/lib/repositories/supabase/supabase-prekey-repository";
import { SupabaseDeviceRepository } from "@/lib/repositories/supabase/supabase-device-call-repository";
import { DeviceCryptoService } from "@/lib/services/device-crypto.service";
import type { JsonValue } from "@/lib/domain/types";

function service(context: { supabase: AppSupabase; userId: string }) {
  if (process.env.DATA_REPOSITORY_DRIVER?.toLowerCase() === "neon") {
    const sql = getPostgresClient();
    const prekeys = new PostgresPrekeyRepository(sql);
    const devices = new PostgresDeviceRepository(sql);
    return new DeviceCryptoService(context.userId, prekeys, devices);
  }
  const prekeys = new SupabasePrekeyRepository(context.supabase);
  const devices = new SupabaseDeviceRepository(context.supabase);
  return new DeviceCryptoService(context.userId, prekeys, devices);
}

const registerBundleSchema = z.object({
  device_id: z.string().uuid(),
  identity_key: z.string().min(10).max(1024),
  signed_prekey: z.string().min(10).max(1024),
  signed_prekey_signature: z.string().min(10).max(2048),
  one_time_prekeys: z.array(
    z.object({
      key_id: z.number().int().nonnegative(),
      public_key: z.string().min(10).max(1024),
    })
  ),
});

export const registerCryptoDeviceBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireNotFrozen])
  .inputValidator((data: unknown) => registerBundleSchema.parse(data))
  .handler(async ({ data, context }) => service(context).registerBundle(data));

export const getDevicePublicPrekeyBundle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ device_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => service(context).getBundle(data.device_id));

const replenishSchema = z.object({
  device_id: z.string().uuid(),
  one_time_prekeys: z.array(
    z.object({
      key_id: z.number().int().nonnegative(),
      public_key: z.string().min(10).max(1024),
    })
  ),
});

export const replenishDeviceOneTimePrekeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireNotFrozen])
  .inputValidator((data: unknown) => replenishSchema.parse(data))
  .handler(async ({ data, context }) => service(context).replenishOneTimePrekeys(data));

const rotateSignedPrekeySchema = z.object({
  device_id: z.string().uuid(),
  signed_prekey: z.string().min(10).max(1024),
  signed_prekey_signature: z.string().min(10).max(2048),
});

export const rotateDeviceSignedPrekey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireNotFrozen])
  .inputValidator((data: unknown) => rotateSignedPrekeySchema.parse(data))
  .handler(async ({ data, context }) => service(context).rotateSignedPrekey(data));

export const revokeDeviceCrypto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireNotFrozen])
  .inputValidator((data: unknown) => z.object({ device_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => service(context).revoke(data.device_id));

// Relay transport placeholders for SDK adapter
export const getE2eeRelayDevices = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Record<string, unknown>)
  .handler(async () => [] as Array<{ protocol_device_id: number; device_type: "mobile" | "desktop" | "tablet" | "web"; enabled: boolean; created_at: string; updated_at: string }>);
export const getE2eeRelayIdentity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Record<string, unknown>)
  .handler(async () => null as { x25519_public_key?: string; ed25519_public_key?: string } | null);
export const getE2eeRelayPreKeyBundle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Record<string, JsonValue>)
  .handler(async () => null as JsonValue);
export const getPendingE2eeEnvelopes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Record<string, unknown>)
  .handler(async () => [] as Array<{ sender_user_id: string; sender_device_id: number; ciphertext: string; message_type: number; client_timestamp: number; client_message_id: string | null; urgent?: boolean; ephemeral?: boolean; id: string; server_timestamp: number }>);
export const markE2eeEnvelopeDelivered = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Record<string, unknown>)
  .handler(async () => {});
export const registerE2eeRelayDevice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Record<string, unknown>)
  .handler(async () => ({ protocol_device_id: 1 }));
export const sendE2eeEnvelope = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Record<string, unknown>)
  .handler(async () => ({ message_id: "", server_timestamp: 0 }));
export const syncE2eeRelayIdentity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Record<string, unknown>)
  .handler(async () => {});
export const syncE2eeRelayPrekeys = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Record<string, unknown>)
  .handler(async () => {});
