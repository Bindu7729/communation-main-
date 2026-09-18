import { useState, useEffect, useCallback } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  offlineSince: Date | null;
}

export interface NetworkTransitionResult {
  status: NetworkStatus;
  shouldTriggerReconnect: boolean;
}

export interface UseNetworkStatusReturn extends NetworkStatus {
  checkConnectivity: () => Promise<boolean>;
}

/**
 * Pure state reducer calculating next network state and whether a reconnect sync should fire.
 */
export function computeNextNetworkStatus(
  current: NetworkStatus,
  nextIsOnline: boolean,
  now = new Date(),
): NetworkTransitionResult {
  if (nextIsOnline) {
    const shouldTrigger = current.wasOffline || !current.isOnline;
    return {
      status: {
        isOnline: true,
        wasOffline: current.wasOffline || !current.isOnline,
        offlineSince: null,
      },
      shouldTriggerReconnect: shouldTrigger,
    };
  }

  return {
    status: {
      isOnline: false,
      wasOffline: true,
      offlineSince: current.offlineSince ?? now,
    },
    shouldTriggerReconnect: false,
  };
}

/**
 * Hook to track network status (online/offline) and trigger re-sync upon reconnection.
 */
export function useNetworkStatus(onReconnect?: () => void): UseNetworkStatusReturn {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
    offlineSince: null,
  }));

  const handleOnline = useCallback(() => {
    setStatus((prev) => {
      const transition = computeNextNetworkStatus(prev, true);
      if (transition.shouldTriggerReconnect) {
        onReconnect?.();
      }
      return transition.status;
    });
  }, [onReconnect]);

  const handleOffline = useCallback(() => {
    setStatus((prev) => computeNextNetworkStatus(prev, false).status);
  }, []);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return true;
    try {
      const res = await fetch("/favicon.ico", { method: "HEAD", cache: "no-store" });
      const reachable = res.ok || res.status < 500;
      if (reachable) {
        handleOnline();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [handleOnline]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check actual server connectivity on mount in case navigator.onLine is reporting false
    if (!navigator.onLine) {
      void checkConnectivity();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline, checkConnectivity]);

  return {
    ...status,
    checkConnectivity,
  };
}
