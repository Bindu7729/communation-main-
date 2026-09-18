import { Capacitor } from "@capacitor/core";

export type SupportedPlatform = "android" | "ios" | "web";

export interface NativeBridgeCapabilities {
  isNative: boolean;
  platform: SupportedPlatform;
  canVibrate: boolean;
  canShare: boolean;
  isStandalonePwa: boolean;
}

export class NativeBridge {
  /**
   * Returns true if running inside a native Capacitor container (Android or iOS).
   */
  static isNativePlatform(): boolean {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  /**
   * Returns the current running platform ("android", "ios", or "web").
   */
  static getPlatform(): SupportedPlatform {
    try {
      const p = Capacitor.getPlatform();
      if (p === "android" || p === "ios") return p;
      return "web";
    } catch {
      return "web";
    }
  }

  static isAndroid(): boolean {
    return this.getPlatform() === "android";
  }

  static isIOS(): boolean {
    return this.getPlatform() === "ios";
  }

  static isWeb(): boolean {
    return this.getPlatform() === "web";
  }

  /**
   * Checks whether the app is currently running as an installed PWA (standalone display-mode).
   */
  static isStandalonePwa(): boolean {
    try {
      if (typeof window === "undefined") return false;
      return (
        Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches) ||
        // iOS Safari standalone flag
        (navigator as unknown as { standalone?: boolean }).standalone === true
      );
    } catch {
      return false;
    }
  }

  /**
   * Triggers a subtle tactile haptic vibration where supported (Android, PWA, modern mobile browsers).
   */
  static vibrate(durationMs = 15): boolean {
    try {
      const nav = typeof navigator !== "undefined" ? navigator : (globalThis as unknown as { navigator?: Navigator }).navigator;
      if (nav && typeof nav.vibrate === "function") {
        return nav.vibrate(durationMs);
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Triggers a notification vibration pattern: short pulse - gap - short pulse.
   */
  static vibrateNotification(): boolean {
    try {
      const nav = typeof navigator !== "undefined" ? navigator : (globalThis as unknown as { navigator?: Navigator }).navigator;
      if (nav && typeof nav.vibrate === "function") {
        return nav.vibrate([40, 60, 40]);
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Inspect current device environment capabilities.
   */
  static getCapabilities(): NativeBridgeCapabilities {
    const nav = typeof navigator !== "undefined" ? navigator : (globalThis as unknown as { navigator?: Navigator }).navigator;
    return {
      isNative: this.isNativePlatform(),
      platform: this.getPlatform(),
      canVibrate: Boolean(nav && typeof nav.vibrate === "function"),
      canShare: Boolean(nav && typeof nav.share === "function"),
      isStandalonePwa: this.isStandalonePwa(),
    };
  }
}
