import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSupabase } from "@/lib/infra/supabase/app-client";
import { mapInfraError } from "@/lib/infra/supabase/map-error";
import type { PrekeyRepository } from "@/lib/repositories/ports";

export class SupabasePrekeyRepository implements PrekeyRepository {
  constructor(private readonly supabase: AppSupabase) {}

  private get client(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async upsertPrekeys(row: {
    device_id: string;
    user_id: string;
    identity_key: string;
    signed_prekey: string;
    signed_prekey_signature: string;
  }): Promise<void> {
    const { error } = await this.client
      .from("device_prekeys")
      .upsert(
        {
          device_id: row.device_id,
          user_id: row.user_id,
          identity_key: row.identity_key,
          signed_prekey: row.signed_prekey,
          signed_prekey_signature: row.signed_prekey_signature,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "device_id" },
      );
    if (error) mapInfraError(error);
  }

  async insertOneTimePrekeys(
    deviceId: string,
    keys: Array<{ key_id: number; public_key: string }>,
  ): Promise<void> {
    if (keys.length === 0) return;
    const rows = keys.map((k) => ({
      device_id: deviceId,
      key_id: k.key_id,
      public_key: k.public_key,
    }));
    const { error } = await this.client
      .from("device_one_time_prekeys")
      .upsert(rows, { onConflict: "device_id,key_id", ignoreDuplicates: true });
    if (error) mapInfraError(error);
  }

  async getPublicBundle(deviceId: string): Promise<{
    device_id: string;
    user_id: string;
    identity_key: string;
    signed_prekey: string;
    signed_prekey_signature: string;
    one_time_prekey: { key_id: number; public_key: string } | null;
  } | null> {
    const { data: main, error } = await this.client
      .from("device_prekeys")
      .select("device_id, user_id, identity_key, signed_prekey, signed_prekey_signature")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (error) mapInfraError(error);
    if (!main) return null;

    const opk = await this.consumeOneTimePrekey(deviceId);
    return {
      device_id: main.device_id,
      user_id: main.user_id,
      identity_key: main.identity_key,
      signed_prekey: main.signed_prekey,
      signed_prekey_signature: main.signed_prekey_signature,
      one_time_prekey: opk,
    };
  }

  async consumeOneTimePrekey(
    deviceId: string,
  ): Promise<{ key_id: number; public_key: string } | null> {
    const { data, error } = await this.client
      .from("device_one_time_prekeys")
      .select("id, key_id, public_key")
      .eq("device_id", deviceId)
      .order("key_id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) mapInfraError(error);
    if (!data) return null;

    // Delete consumed OPK
    const { error: delError } = await this.client
      .from("device_one_time_prekeys")
      .delete()
      .eq("id", data.id);
    if (delError) mapInfraError(delError);

    return { key_id: data.key_id, public_key: data.public_key };
  }

  async getOneTimePrekeyCount(deviceId: string): Promise<number> {
    const { count, error } = await this.client
      .from("device_one_time_prekeys")
      .select("*", { count: "exact", head: true })
      .eq("device_id", deviceId);
    if (error) mapInfraError(error);
    return count ?? 0;
  }

  async revokeDevicePrekeys(deviceId: string): Promise<void> {
    const { error: e1 } = await this.client
      .from("device_prekeys")
      .delete()
      .eq("device_id", deviceId);
    if (e1) mapInfraError(e1);

    const { error: e2 } = await this.client
      .from("device_one_time_prekeys")
      .delete()
      .eq("device_id", deviceId);
    if (e2) mapInfraError(e2);
  }
}
