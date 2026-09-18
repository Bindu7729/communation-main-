import { describe, it, expect } from "vitest";
import { computeNextNetworkStatus, type NetworkStatus } from "@/hooks/use-network-status";

describe("Network Status Transitions", () => {
  it("initializes in online state and does not trigger reconnect when already online", () => {
    const current: NetworkStatus = {
      isOnline: true,
      wasOffline: false,
      offlineSince: null,
    };

    const result = computeNextNetworkStatus(current, true);
    expect(result.status.isOnline).toBe(true);
    expect(result.status.wasOffline).toBe(false);
    expect(result.shouldTriggerReconnect).toBe(false);
  });

  it("transitions to offline state and records timestamp", () => {
    const current: NetworkStatus = {
      isOnline: true,
      wasOffline: false,
      offlineSince: null,
    };
    const now = new Date("2026-09-14T10:00:00Z");

    const result = computeNextNetworkStatus(current, false, now);
    expect(result.status.isOnline).toBe(false);
    expect(result.status.wasOffline).toBe(true);
    expect(result.status.offlineSince).toEqual(now);
    expect(result.shouldTriggerReconnect).toBe(false);
  });

  it("preserves initial offline timestamp during consecutive offline events", () => {
    const initialOffline = new Date("2026-09-14T10:00:00Z");
    const current: NetworkStatus = {
      isOnline: false,
      wasOffline: true,
      offlineSince: initialOffline,
    };
    const later = new Date("2026-09-14T10:05:00Z");

    const result = computeNextNetworkStatus(current, false, later);
    expect(result.status.isOnline).toBe(false);
    expect(result.status.offlineSince).toEqual(initialOffline);
    expect(result.shouldTriggerReconnect).toBe(false);
  });

  it("triggers reconnect sync when recovering from offline to online", () => {
    const current: NetworkStatus = {
      isOnline: false,
      wasOffline: true,
      offlineSince: new Date("2026-09-14T10:00:00Z"),
    };

    const result = computeNextNetworkStatus(current, true);
    expect(result.status.isOnline).toBe(true);
    expect(result.status.wasOffline).toBe(true);
    expect(result.status.offlineSince).toBeNull();
    expect(result.shouldTriggerReconnect).toBe(true);
  });
});
