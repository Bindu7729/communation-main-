import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getDeviceKey, rotateDeviceKey, clearDeviceKey, guessDeviceName } from "@/lib/device-key";

describe("device-key utility", () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    const mockStorage = {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, val: string) => {
        localStorageMock[key] = val;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        localStorageMock = {};
      },
    };
    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", {
      localStorage: mockStorage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("getDeviceKey", () => {
    it("generates and stores a new UUID device key when none exists", () => {
      const key = getDeviceKey();
      expect(key).toBeDefined();
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(localStorageMock["ghostline.device_key"]).toBe(key);
    });

    it("returns existing stored device key idempotently", () => {
      const existing = "test-device-uuid-1234";
      localStorageMock["ghostline.device_key"] = existing;

      const key = getDeviceKey();
      expect(key).toBe(existing);
    });

    it("isolates device keys by user ID when userId is provided", () => {
      const userA = "user-alice";
      const userB = "user-bob";

      const keyA = getDeviceKey(userA);
      const keyB = getDeviceKey(userB);

      expect(keyA).not.toBe(keyB);
      expect(localStorageMock[`ghostline.device_key.${userA}`]).toBe(keyA);
      expect(localStorageMock[`ghostline.device_key.${userB}`]).toBe(keyB);
    });
  });

  describe("rotateDeviceKey", () => {
    it("generates a new key and overwrites existing key", () => {
      const initialKey = getDeviceKey();
      const rotatedKey = rotateDeviceKey();

      expect(rotatedKey).not.toBe(initialKey);
      expect(localStorageMock["ghostline.device_key"]).toBe(rotatedKey);
    });

    it("updates both scoped user key and base key when userId is provided", () => {
      const userId = "user-123";
      const initialUserKey = getDeviceKey(userId);
      const rotatedKey = rotateDeviceKey(userId);

      expect(rotatedKey).not.toBe(initialUserKey);
      expect(localStorageMock[`ghostline.device_key.${userId}`]).toBe(rotatedKey);
      expect(localStorageMock["ghostline.device_key"]).toBe(rotatedKey);
    });
  });

  describe("clearDeviceKey", () => {
    it("removes device key from localStorage", () => {
      getDeviceKey();
      expect(localStorageMock["ghostline.device_key"]).toBeDefined();

      clearDeviceKey();
      expect(localStorageMock["ghostline.device_key"]).toBeUndefined();
    });

    it("removes both scoped and base keys when userId is provided", () => {
      const userId = "user-456";
      rotateDeviceKey(userId);

      clearDeviceKey(userId);
      expect(localStorageMock[`ghostline.device_key.${userId}`]).toBeUndefined();
      expect(localStorageMock["ghostline.device_key"]).toBeUndefined();
    });
  });

  describe("guessDeviceName", () => {
    function setUA(ua: string) {
      vi.stubGlobal("navigator", { userAgent: ua });
    }

    it("identifies iPhone user agent", () => {
      setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15");
      expect(guessDeviceName()).toBe("iPhone");
    });

    it("identifies iPad user agent", () => {
      setUA("Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15");
      expect(guessDeviceName()).toBe("iPad");
    });

    it("identifies Android user agent", () => {
      setUA("Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36");
      expect(guessDeviceName()).toBe("Android");
    });

    it("identifies Windows user agent", () => {
      setUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
      expect(guessDeviceName()).toBe("Windows PC");
    });

    it("identifies Mac user agent", () => {
      setUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
      expect(guessDeviceName()).toBe("Mac");
    });

    it("identifies Linux user agent", () => {
      setUA("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
      expect(guessDeviceName()).toBe("Linux");
    });

    it("falls back to Web browser for generic user agent", () => {
      setUA("CustomBot/1.0");
      expect(guessDeviceName()).toBe("Web browser");
    });
  });
});
