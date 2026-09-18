import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NativeBridge } from "@/lib/native/native-bridge";
import { Capacitor } from "@capacitor/core";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

describe("NativeBridge", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects web platform when not running inside Capacitor", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");

    expect(NativeBridge.isNativePlatform()).toBe(false);
    expect(NativeBridge.getPlatform()).toBe("web");
    expect(NativeBridge.isWeb()).toBe(true);
    expect(NativeBridge.isAndroid()).toBe(false);
    expect(NativeBridge.isIOS()).toBe(false);
  });

  it("detects Android platform when running inside Android Capacitor container", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");

    expect(NativeBridge.isNativePlatform()).toBe(true);
    expect(NativeBridge.getPlatform()).toBe("android");
    expect(NativeBridge.isAndroid()).toBe(true);
    expect(NativeBridge.isWeb()).toBe(false);
  });

  it("detects iOS platform when running inside iOS Capacitor container", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");

    expect(NativeBridge.isNativePlatform()).toBe(true);
    expect(NativeBridge.getPlatform()).toBe("ios");
    expect(NativeBridge.isIOS()).toBe(true);
    expect(NativeBridge.isWeb()).toBe(false);
  });

  it("handles navigator.vibrate calls safely", () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis.navigator, "vibrate", {
      value: vibrateMock,
      configurable: true,
      writable: true,
    });

    try {
      const result = NativeBridge.vibrate(50);
      expect(result).toBe(true);
      expect(vibrateMock).toHaveBeenCalledWith(50);

      const notifResult = NativeBridge.vibrateNotification();
      expect(notifResult).toBe(true);
      expect(vibrateMock).toHaveBeenCalledWith([40, 60, 40]);
    } finally {
      // @ts-expect-error cleanup
      delete globalThis.navigator.vibrate;
    }
  });

  it("returns device capabilities correctly", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");

    const caps = NativeBridge.getCapabilities();
    expect(caps.isNative).toBe(false);
    expect(caps.platform).toBe("web");
    expect(typeof caps.canVibrate).toBe("boolean");
  });
});
