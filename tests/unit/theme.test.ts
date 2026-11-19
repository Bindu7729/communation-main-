import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveScheme,
  applyTheme,
  readStorage,
  DEFAULT_THEME,
  DEFAULT_ACCENT,
  THEME_KEY,
  ACCENT_KEY,
  type ThemeMode,
  type AccentColor,
} from "@/hooks/use-theme";

describe("Theme System Utilities", () => {
  let localStorageMock: Record<string, string>;
  let mockHtmlElement: {
    classList: {
      add: (cls: string) => void;
      remove: (cls: string) => void;
      contains: (cls: string) => boolean;
      _classes: Set<string>;
    };
    setAttribute: (name: string, value: string) => void;
    removeAttribute: (name: string) => void;
    getAttribute: (name: string) => string | null;
    _attrs: Map<string, string>;
  };

  beforeEach(() => {
    localStorageMock = {};
    const classes = new Set<string>();
    const attrs = new Map<string, string>();

    mockHtmlElement = {
      classList: {
        _classes: classes,
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        contains: (c: string) => classes.has(c),
      },
      _attrs: attrs,
      setAttribute: (name: string, val: string) => attrs.set(name, val),
      removeAttribute: (name: string) => attrs.delete(name),
      getAttribute: (name: string) => attrs.get(name) ?? null,
    };

    const mockStorage = {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, val: string) => {
        localStorageMock[key] = val;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
    };

    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", {
      localStorage: mockStorage,
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    vi.stubGlobal("document", {
      documentElement: mockHtmlElement,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("Constants and Storage Reading", () => {
    it("has correct defaults for theme and accent", () => {
      expect(DEFAULT_THEME).toBe("light");
      expect(DEFAULT_ACCENT).toBe("blue");
      expect(THEME_KEY).toBe("gl-theme");
      expect(ACCENT_KEY).toBe("gl-accent");
    });

    it("reads existing value from storage", () => {
      localStorageMock["gl-theme"] = "dark";
      expect(readStorage("gl-theme", "light")).toBe("dark");
    });

    it("falls back to default value when key is absent", () => {
      expect(readStorage("gl-accent", "blue")).toBe("blue");
    });
  });

  describe("resolveScheme", () => {
    it("resolves dark for dark and blue-dim modes", () => {
      expect(resolveScheme("dark")).toBe("dark");
      expect(resolveScheme("blue-dim")).toBe("dark");
    });

    it("resolves light for light mode", () => {
      expect(resolveScheme("light")).toBe("light");
    });

    it("resolves system mode using explicit systemPrefersDark parameter", () => {
      expect(resolveScheme("system", true)).toBe("dark");
      expect(resolveScheme("system", false)).toBe("light");
    });

    it("resolves system mode via window.matchMedia when systemPrefersDark is omitted", () => {
      expect(resolveScheme("system")).toBe("dark");
    });
  });

  describe("applyTheme", () => {
    it("applies light theme with chosen accent", () => {
      applyTheme("light", "green");
      expect(mockHtmlElement.classList.contains("dark")).toBe(false);
      expect(mockHtmlElement.getAttribute("data-theme")).toBeNull();
      expect(mockHtmlElement.getAttribute("data-accent")).toBe("green");
    });

    it("applies dark theme with chosen accent", () => {
      applyTheme("dark", "purple");
      expect(mockHtmlElement.classList.contains("dark")).toBe(true);
      expect(mockHtmlElement.getAttribute("data-theme")).toBeNull();
      expect(mockHtmlElement.getAttribute("data-accent")).toBe("purple");
    });

    it("applies blue-dim theme with data-theme attribute and dark class", () => {
      applyTheme("blue-dim", "blue");
      expect(mockHtmlElement.classList.contains("dark")).toBe(true);
      expect(mockHtmlElement.getAttribute("data-theme")).toBe("blue-dim");
      expect(mockHtmlElement.getAttribute("data-accent")).toBe("blue");
    });

    it("cleans up previous dark and data-theme states on mode switch", () => {
      applyTheme("blue-dim", "yellow");
      expect(mockHtmlElement.classList.contains("dark")).toBe(true);
      expect(mockHtmlElement.getAttribute("data-theme")).toBe("blue-dim");

      applyTheme("light", "red");
      expect(mockHtmlElement.classList.contains("dark")).toBe(false);
      expect(mockHtmlElement.getAttribute("data-theme")).toBeNull();
      expect(mockHtmlElement.getAttribute("data-accent")).toBe("red");
    });
  });
});
