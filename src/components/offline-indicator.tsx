import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { WifiOff, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useNetworkStatus } from "@/hooks/use-network-status";

export function OfflineIndicator() {
  const queryClient = useQueryClient();
  const hadOfflineRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const routerState = useRouterState();
  const pathname = routerState?.location?.pathname ?? "";

  const { isOnline, checkConnectivity } = useNetworkStatus(() => {
    if (hadOfflineRef.current) {
      toast.success("Back online — syncing conversations...", {
        duration: 3000,
        id: "network-status-toast",
      });
      void queryClient.invalidateQueries();
      hadOfflineRef.current = false;
      setDismissed(false);
    }
  });

  useEffect(() => {
    if (!isOnline) {
      hadOfflineRef.current = true;
    }
  }, [isOnline]);

  // Do not show the offline message queue banner on public or auth pages
  const isPublicPage = pathname === "/" || pathname === "/auth" || pathname.startsWith("/auth/");
  if (isOnline || dismissed || isPublicPage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-amber-500/95 px-4 py-2 text-xs font-medium text-amber-950 backdrop-blur transition-all dark:bg-amber-600/95 dark:text-amber-100"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
        <span>You are currently offline. Messages will be sent when connection is restored.</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={async () => {
            const connected = await checkConnectivity();
            if (connected) {
              toast.success("Connection verified!");
              void queryClient.invalidateQueries();
            } else {
              toast.error("Still unable to reach server");
            }
          }}
          className="inline-flex items-center gap-1 rounded bg-amber-950/15 px-2 py-1 text-[11px] font-semibold hover:bg-amber-950/25 active:scale-95 dark:bg-amber-100/15 dark:hover:bg-amber-100/25"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-amber-950/70 hover:bg-amber-950/10 hover:text-amber-950 dark:text-amber-100/70 dark:hover:bg-amber-100/10 dark:hover:text-amber-100"
          title="Dismiss notification"
          aria-label="Dismiss offline banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
