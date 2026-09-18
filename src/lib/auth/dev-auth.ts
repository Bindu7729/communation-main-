import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { AuthUser } from "@/lib/domain/types";

/**
 * Deterministic Development User Identity
 * UUID format so Neon / PostgreSQL schema UUID constraints pass without error.
 */
export const DEV_USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "dev@ghostline.local",
};

export type DevUserProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
};

export const DEV_USER_PROFILE: DevUserProfile = {
  id: DEV_USER.id,
  username: "devghost",
  display_name: "Ghostline Developer",
  bio: "Development identity for local verification",
  avatar_url: null,
};

/**
 * User requested login credentials:
 * email: pbibinduamb@gmail.com
 * name: bindu
 * password: bindu@295
 */
export const BINDU_USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000002",
  email: "pbibinduamb@gmail.com",
};

export const BINDU_USER_PROFILE: DevUserProfile = {
  id: BINDU_USER.id,
  username: "bindu",
  display_name: "bindu",
  bio: "Ghostline user",
  avatar_url: null,
};

export const DEV_DEVICE_KEY = "dev-device-ghostline";
export const DEV_AUTH_STORAGE_KEY = "ghostline.dev_auth_active";
export const DEV_ACTIVE_USER_STORAGE_KEY = "ghostline.dev_active_user";
export const DEV_AUTH_HEADER_PREFIX = "DEV_BYPASS_TOKEN_";

/**
 * Check if Development Auth Bypass is enabled.
 * Production Safety Guard: Fails closed in production.
 */
export function isDevAuthBypassEnabled(): boolean {
  const isEnvEnabled =
    import.meta.env.VITE_DEV_AUTH_BYPASS === "true" ||
    (typeof process !== "undefined" && process.env?.VITE_DEV_AUTH_BYPASS === "true");

  if (isEnvEnabled) {
    if (import.meta.env.PROD || (typeof process !== "undefined" && process.env?.NODE_ENV === "production")) {
      throw new Error("SECURITY FAULT: Development auth bypass cannot run in production environment");
    }
    return true;
  }
  return false;
}

/**
 * Check if the active session in browser is in Dev Auth mode.
 */
export function isDevAuthActive(): boolean {
  if (!isDevAuthBypassEnabled()) return false;
  if (typeof window === "undefined" || !window.localStorage) return false;
  return window.localStorage.getItem(DEV_AUTH_STORAGE_KEY) === "true";
}

export function setDevAuthActive(active: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (active) {
    window.localStorage.setItem(DEV_AUTH_STORAGE_KEY, "true");
  } else {
    window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(DEV_ACTIVE_USER_STORAGE_KEY);
  }
}

export function getActiveDevUser(): AuthUser {
  if (typeof window !== "undefined" && window.localStorage) {
    const raw = window.localStorage.getItem(DEV_ACTIVE_USER_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
  }
  return DEV_USER;
}

export function setActiveDevUser(user: AuthUser, profile?: typeof DEV_USER_PROFILE): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(DEV_ACTIVE_USER_STORAGE_KEY, JSON.stringify(user));
  if (profile) {
    window.localStorage.setItem(`ghostline.dev_profile.${user.id}`, JSON.stringify(profile));
  }
}

const inMemoryDevProfiles: Record<string, typeof DEV_USER_PROFILE> = {
  [DEV_USER.id]: { ...DEV_USER_PROFILE },
  [BINDU_USER.id]: { ...BINDU_USER_PROFILE },
};

export function updateDevUserProfile(
  userId: string,
  patch: Partial<typeof DEV_USER_PROFILE>,
): typeof DEV_USER_PROFILE {
  const current = getActiveDevUserProfile(userId);
  const updated = {
    ...current,
    ...patch,
  };
  inMemoryDevProfiles[userId] = updated;
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(`ghostline.dev_profile.${userId}`, JSON.stringify(updated));
  }
  return updated;
}

export function getActiveDevUserProfile(userId: string): typeof DEV_USER_PROFILE {
  if (typeof window !== "undefined" && window.localStorage) {
    const raw = window.localStorage.getItem(`ghostline.dev_profile.${userId}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
  }
  if (inMemoryDevProfiles[userId]) {
    return inMemoryDevProfiles[userId];
  }
  if (userId === BINDU_USER.id) return BINDU_USER_PROFILE;
  return DEV_USER_PROFILE;
}

/**
 * Creates a mock session object for the development user.
 */
export function getDevSession(targetUser?: AuthUser): Session {
  const user =
    targetUser ??
    (typeof window !== "undefined" && window.localStorage?.getItem(DEV_ACTIVE_USER_STORAGE_KEY)
      ? getActiveDevUser()
      : DEV_USER);
  const profile = getActiveDevUserProfile(user.id);

  return {
    access_token: `${DEV_AUTH_HEADER_PREFIX}${user.id}`,
    token_type: "bearer",
    expires_in: 3600 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
    refresh_token: "dev-refresh-token",
    user: {
      id: user.id,
      app_metadata: { provider: "dev_bypass" },
      user_metadata: { name: profile.display_name, username: profile.username },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email: user.email ?? undefined,
    },
  };
}

let devAuthListeners: ((event: AuthChangeEvent, session: Session | null) => void)[] = [];

export function notifyDevAuthChange(event: AuthChangeEvent, session: Session | null) {
  devAuthListeners.forEach((cb) => {
    try {
      cb(event, session);
    } catch (e) {
      console.warn("Dev auth listener failed", e);
    }
  });
}

export function onDevAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>,
) {
  devAuthListeners.push(callback);
  return {
    data: {
      subscription: {
        unsubscribe: () => {
          devAuthListeners = devAuthListeners.filter((cb) => cb !== callback);
        },
      },
    },
  };
}
