import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Phone, Users, Settings, Home, LogIn, User } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { authService } from "@/lib/auth/session";
import { isDevAuthActive, getActiveDevUser, getActiveDevUserProfile, DEV_USER } from "@/lib/auth/dev-auth";

const tabs = [
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/contacts", label: "People", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function GhostMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 11a8 8 0 1 1 16 0v8.2c0 .9-1 1.4-1.7.9l-1.6-1.2a1.2 1.2 0 0 0-1.5.05l-1.1.9a1.2 1.2 0 0 1-1.6-.03l-1-.9a1.2 1.2 0 0 0-1.5-.04L8.2 20c-.7.5-1.7 0-1.7-.9V11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.5 10.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 13.8h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  const [currentUserProfile, setCurrentUserProfile] = useState<{ displayName: string; username: string }>({
    displayName: "Bindu",
    username: "bindu",
  });

  useEffect(() => {
    authService.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (user) {
        if (isDevAuthActive()) {
          const p = getActiveDevUserProfile(user.id ?? DEV_USER.id);
          setCurrentUserProfile({
            displayName: p.display_name || "Bindu",
            username: p.username || "bindu",
          });
        } else {
          const meta = user.user_metadata as Record<string, unknown> | undefined;
          const name = typeof meta?.name === "string" ? meta.name : typeof meta?.display_name === "string" ? meta.display_name : "Bindu";
          const username = typeof meta?.username === "string" ? meta.username : user.email?.split("@")[0] || "bindu";
          setCurrentUserProfile({
            displayName: name,
            username,
          });
        }
      }
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-border bg-sidebar px-3 py-5 lg:flex">
        {/* Logo */}
        <Link to="/" className="mb-6 flex items-center gap-2.5 px-3 transition-opacity hover:opacity-85" title="Go to Homepage">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/25">
            <GhostMark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold tracking-tight text-foreground">Ghostline</p>
            <p className="text-[11px] text-muted-foreground">Private conversations</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="grid gap-0.5">
          {tabs.map((tab) => {
            const active = isActive(tab.to);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={[
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                ].join(" ")}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon
                  className={["h-[18px] w-[18px] shrink-0", active ? "text-primary" : ""].join(" ")}
                  strokeWidth={active ? 2.4 : 2}
                />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="mt-auto" />

        {/* User Identity Card */}
        <Link
          to="/profile"
          className="mb-2 flex items-center gap-2.5 rounded-xl border border-border bg-surface-2/70 p-2.5 transition-all hover:bg-surface-2 hover:border-primary/40 group"
          title={`Signed in as ${currentUserProfile.displayName} (@${currentUserProfile.username})`}
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-bold text-white text-xs shadow-xs group-hover:scale-105 transition-transform">
            {currentUserProfile.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-foreground leading-tight">
              {currentUserProfile.displayName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              @{currentUserProfile.username}
            </p>
          </div>
        </Link>

        {/* Quick Links */}
        <div className="mb-3 grid gap-1 border-t border-border pt-2.5">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-surface-2 hover:text-foreground"
          >
            <Home className="h-4 w-4 shrink-0 text-primary" />
            Homepage
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-surface-2 hover:text-foreground"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            Login / Register
          </Link>
        </div>

        {/* Privacy badge */}
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[11px] text-muted-foreground">
          <svg className="h-3.5 w-3.5 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          Messages stay private
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="glass border-t border-border">
          <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
            {tabs.map((tab) => {
              const active = isActive(tab.to);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={[
                    "relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-4 transition-all duration-150",
                    active ? "text-primary" : "text-muted-foreground active:scale-95",
                  ].join(" ")}
                >
                  <Icon className="h-[20px] w-[20px] shrink-0" strokeWidth={active ? 2.4 : 2} />
                  <span className={["text-[10px] font-semibold tracking-wide", active ? "text-primary" : ""].join(" ")}>
                    {tab.label}
                  </span>
                  {active && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
