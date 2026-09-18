import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AuthUser } from "@/lib/domain/types";

import {
  isDevAuthActive,
  isDevAuthBypassEnabled,
  setDevAuthActive,
  getDevSession,
  DEV_USER,
  BINDU_USER,
  BINDU_USER_PROFILE,
  getActiveDevUser,
  setActiveDevUser,
  notifyDevAuthChange,
  onDevAuthStateChange,
  getRegisteredDevAccounts,
  saveRegisteredDevAccount,
} from "./dev-auth";

export { isDevAuthBypassEnabled };

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isDevAuthActive()) return getActiveDevUser();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function getSession() {
  if (isDevAuthActive()) return { data: { session: getDevSession() }, error: null };
  return supabase.auth.getSession();
}

export type AuthChangeCallback = (
  event: AuthChangeEvent,
  session: Session | null,
) => void | Promise<void>;

export function onAuthStateChange(callback: AuthChangeCallback) {
  const devSub = onDevAuthStateChange(callback);
  const supSub = supabase.auth.onAuthStateChange(callback as Parameters<typeof supabase.auth.onAuthStateChange>[0]);

  return {
    data: {
      subscription: {
        unsubscribe: () => {
          devSub.data.subscription.unsubscribe();
          supSub.data.subscription.unsubscribe();
        },
      },
    },
  };
}

export async function signInWithPassword(email: string, password: string) {
  const trimmed = email.trim().toLowerCase();
  const isDev = isDevAuthBypassEnabled() || (typeof import.meta !== "undefined" && import.meta.env?.DEV);

  if (isDev) {
    if (trimmed === "pbibinduamb@gmail.com") {
      if (password !== "bindu@295") {
        return { data: { user: null, session: null }, error: { message: "Invalid login credentials." } };
      }
      setActiveDevUser(BINDU_USER, BINDU_USER_PROFILE);
      setDevAuthActive(true);
      const session = getDevSession(BINDU_USER);
      notifyDevAuthChange("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    }

    if (trimmed === "dev@ghostline.local") {
      setActiveDevUser(DEV_USER);
      setDevAuthActive(true);
      const session = getDevSession(DEV_USER);
      notifyDevAuthChange("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    }

    const registered = getRegisteredDevAccounts().find((a) => a.user.email?.toLowerCase() === trimmed);
    if (registered) {
      if (password !== registered.password) {
        return { data: { user: null, session: null }, error: { message: "Invalid login credentials." } };
      }
      setActiveDevUser(registered.user, registered.profile);
      setDevAuthActive(true);
      const session = getDevSession(registered.user);
      notifyDevAuthChange("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    }
  }

  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string, emailRedirectTo: string) {
  const trimmed = email.trim().toLowerCase();
  const isDev = isDevAuthBypassEnabled() || (typeof import.meta !== "undefined" && import.meta.env?.DEV);

  if (isDev) {
    if (trimmed === "pbibinduamb@gmail.com") {
      setActiveDevUser(BINDU_USER, BINDU_USER_PROFILE);
      setDevAuthActive(true);
      const session = getDevSession(BINDU_USER);
      notifyDevAuthChange("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    }

    // Generic dev signup support when cloud Supabase is not connected
    const customUser: AuthUser = {
      id: "00000000-0000-0000-0000-" + Math.floor(100000000000 + Math.random() * 900000000000).toString(),
      email: trimmed,
    };
    const username = trimmed.split("@")[0] || "user";
    const customProfile = {
      id: customUser.id,
      username,
      display_name: username,
      bio: "Ghostline user",
      avatar_url: null,
    };
    saveRegisteredDevAccount({ user: customUser, profile: customProfile, password });
    setActiveDevUser(customUser, customProfile);
    setDevAuthActive(true);
    const session = getDevSession(customUser);
    notifyDevAuthChange("SIGNED_IN", session);
    return { data: { user: session.user, session }, error: null };
  }

  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
}

export async function signOut() {
  if (isDevAuthActive()) {
    setDevAuthActive(false);
    notifyDevAuthChange("SIGNED_OUT", null);
    return { error: null };
  }

  // Best-effort attempt to update last_seen before disconnecting
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", session.user.id);
    }
  } catch {
    // ignore
  }

  return supabase.auth.signOut();
}

export async function signInWithGoogle(redirectUri: string) {
  const isDev = isDevAuthBypassEnabled() || (typeof import.meta !== "undefined" && import.meta.env?.DEV);
  const supabaseUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
    "";
  const isUnconfigured = !supabaseUrl || supabaseUrl.includes("unconfigured-dev") || supabaseUrl.includes("your-project");

  if (isDev || isUnconfigured) {
    setActiveDevUser(BINDU_USER, BINDU_USER_PROFILE);
    setDevAuthActive(true);
    const session = getDevSession(BINDU_USER);
    notifyDevAuthChange("SIGNED_IN", session);
    return { data: { provider: "google" as const, url: null }, error: null };
  }

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectUri },
  });
}

export async function signInWithGithub(redirectUri: string) {
  const isDev = isDevAuthBypassEnabled() || (typeof import.meta !== "undefined" && import.meta.env?.DEV);
  const supabaseUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
    "";
  const isUnconfigured = !supabaseUrl || supabaseUrl.includes("unconfigured-dev") || supabaseUrl.includes("your-project");

  if (isDev || isUnconfigured) {
    setActiveDevUser(BINDU_USER, BINDU_USER_PROFILE);
    setDevAuthActive(true);
    const session = getDevSession(BINDU_USER);
    notifyDevAuthChange("SIGNED_IN", session);
    return { data: { provider: "github" as const, url: null }, error: null };
  }

  return supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: redirectUri },
  });
}

export async function resendVerificationEmail(email: string, emailRedirectTo: string) {
  return supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } });
}

export async function signInWithDevBypass() {
  if (!isDevAuthBypassEnabled()) throw new Error("Dev bypass disabled");
  setDevAuthActive(true);
  const session = getDevSession();
  notifyDevAuthChange("SIGNED_IN", session);
  return { user: session.user };
}

/** Application auth façade. Implementation is still Supabase (+ Lovable Google). */
export const authService = {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  signInWithGoogle,
  signInWithGithub,
  resendVerificationEmail,
  isDevAuthBypassEnabled,
  signInWithDevBypass,
};
