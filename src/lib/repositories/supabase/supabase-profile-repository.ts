import type { AppSupabase } from "@/lib/infra/supabase/app-client";
import { isUniqueViolation, mapInfraError } from "@/lib/infra/supabase/map-error";
import type { ChatProfile, FriendProfile, Profile } from "@/lib/domain/types";
import type { ProfilePatch, ProfileRepository } from "@/lib/repositories/ports";
import { ConflictError } from "@/lib/domain/errors";
import { isDevAuthBypassEnabled, getActiveDevUserProfile, updateDevUserProfile, DEV_USER, BINDU_USER, ASSISTANT_USER, getRegisteredDevAccounts } from "@/lib/auth/dev-auth";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly supabase: AppSupabase) {}

  async getById(id: string): Promise<Profile | null> {
    if (isDevAuthBypassEnabled()) {
      const devProfile = getActiveDevUserProfile(id);
      return {
        id,
        username: devProfile.username,
        display_name: devProfile.display_name,
        bio: devProfile.bio,
        avatar_url: devProfile.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile;
    }
    try {
      const { data, error } = await this.supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) mapInfraError(error);
      return (data as Profile | null) ?? null;
    } catch (err) {
      if (isDevAuthBypassEnabled()) {
        const devProfile = getActiveDevUserProfile(id);
        return {
          id,
          username: devProfile.username,
          display_name: devProfile.display_name,
          bio: devProfile.bio,
          avatar_url: devProfile.avatar_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }
      throw err;
    }
  }

  async update(id: string, patch: ProfilePatch): Promise<Profile> {
    if (isDevAuthBypassEnabled()) {
      const updated = updateDevUserProfile(id, patch);
      return {
        id,
        username: updated.username,
        display_name: updated.display_name,
        bio: updated.bio,
        avatar_url: updated.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile;
    }
    try {
      const { data, error } = await this.supabase
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if (isUniqueViolation(error)) throw new ConflictError("Username is taken");
        mapInfraError(error);
      }
      return data as Profile;
    } catch (err) {
      if (isDevAuthBypassEnabled()) {
        const updated = updateDevUserProfile(id, patch);
        return {
          id,
          username: updated.username,
          display_name: updated.display_name,
          bio: updated.bio,
          avatar_url: updated.avatar_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }
      throw err;
    }
  }

  async search(query: string, excludeId: string): Promise<FriendProfile[]> {
    const q = query.toLowerCase().replace(/[%_]/g, "\\$&");
    if (isDevAuthBypassEnabled()) {
      const candidates = [
        getActiveDevUserProfile(BINDU_USER.id),
        getActiveDevUserProfile(DEV_USER.id),
        getActiveDevUserProfile(ASSISTANT_USER.id),
        ...getRegisteredDevAccounts().map((a) => a.profile),
      ];
      const matched = candidates.filter((p) => {
        if (!p || p.id === excludeId) return false;
        if (!q) return true;
        return (
          p.username.toLowerCase().includes(q) ||
          p.display_name.toLowerCase().includes(q)
        );
      });
      return matched.map((p) => ({
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      }));
    }
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq("id", excludeId)
      .limit(20);
    if (error) mapInfraError(error);
    return (data ?? []) as FriendProfile[];
  }

  async getChatProfiles(ids: string[]): Promise<ChatProfile[]> {
    if (ids.length === 0) return [];
    if (isDevAuthBypassEnabled()) {
      return ids.map((id) => {
        const p = getActiveDevUserProfile(id);
        return {
          id,
          username: p.username,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          last_seen: new Date().toISOString(),
        };
      });
    }
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, last_seen")
      .in("id", ids);
    if (error) mapInfraError(error);
    return (data ?? []) as ChatProfile[];
  }

  async getCallPeer(id: string) {
    if (isDevAuthBypassEnabled()) {
      const p = getActiveDevUserProfile(id);
      return {
        id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      };
    }
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", id)
      .maybeSingle();
    if (error) mapInfraError(error);
    return data ?? null;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const normalized = username.replace(/^@/, '').trim().toLowerCase();
    if (!normalized) return false;

    if (isDevAuthBypassEnabled()) {
      const reserved = ["bindu", "devghost", "ghostline"];
      const registered = getRegisteredDevAccounts().map((a) => a.profile.username.toLowerCase());
      return !reserved.includes(normalized) && !registered.includes(normalized);
    }

    const { data, error } = await this.supabase
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .limit(1)
      .maybeSingle();
      
    if (error) mapInfraError(error);
    return data === null;
  }
}
