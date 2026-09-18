import type { AppSupabase } from "@/lib/infra/supabase/app-client";
import { isUniqueViolation, mapInfraError } from "@/lib/infra/supabase/map-error";
import type { ChatProfile, FriendProfile, Profile } from "@/lib/domain/types";
import type { ProfilePatch, ProfileRepository } from "@/lib/repositories/ports";
import { ConflictError } from "@/lib/domain/errors";
import { isDevAuthBypassEnabled, getActiveDevUserProfile, updateDevUserProfile, DEV_USER, BINDU_USER } from "@/lib/auth/dev-auth";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly supabase: AppSupabase) {}

  async getById(id: string): Promise<Profile | null> {
    if (isDevAuthBypassEnabled() && (id === BINDU_USER.id || id === DEV_USER.id)) {
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
    if (isDevAuthBypassEnabled() && (id === BINDU_USER.id || id === DEV_USER.id)) {
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
    try {
      const { data, error } = await this.supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq("id", excludeId)
        .limit(20);
      if (error) mapInfraError(error);
      return (data ?? []) as FriendProfile[];
    } catch (err) {
      if (isDevAuthBypassEnabled()) {
        const devProfile = getActiveDevUserProfile(BINDU_USER.id);
        if (devProfile.id !== excludeId && (devProfile.username.includes(q) || devProfile.display_name.toLowerCase().includes(q))) {
          return [{
            id: devProfile.id,
            username: devProfile.username,
            display_name: devProfile.display_name,
            avatar_url: devProfile.avatar_url,
          }];
        }
        return [];
      }
      throw err;
    }
  }

  async getChatProfiles(ids: string[]): Promise<ChatProfile[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, last_seen")
      .in("id", ids);
    if (error) mapInfraError(error);
    return (data ?? []) as ChatProfile[];
  }

  async getCallPeer(id: string) {
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
