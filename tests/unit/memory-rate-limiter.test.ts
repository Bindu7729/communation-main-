import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryRateLimiter } from "@/lib/infra/memory-rate-limiter";
import { RateLimitError } from "@/lib/domain/errors";

describe("InMemoryRateLimiter", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter(
      { windowMs: 1000, maxRequests: 3 },
      { auth_login: { windowMs: 2000, maxRequests: 2 } },
    );
  });

  it("allows hits within default rate limit threshold", async () => {
    await limiter.hit("messages", "user-1");
    await limiter.hit("messages", "user-1");
    await limiter.hit("messages", "user-1");

    expect(limiter.getHitCount("messages", "user-1")).toBe(3);
  });

  it("throws RateLimitError when default limit is exceeded", async () => {
    await limiter.hit("messages", "user-1");
    await limiter.hit("messages", "user-1");
    await limiter.hit("messages", "user-1");

    await expect(limiter.hit("messages", "user-1")).rejects.toThrow(RateLimitError);
    await expect(limiter.hit("messages", "user-1")).rejects.toThrow(
      "Too many requests for messages. Please try again shortly.",
    );
  });

  it("applies bucket-specific limits", async () => {
    await limiter.hit("auth_login", "user-1");
    await limiter.hit("auth_login", "user-1");

    await expect(limiter.hit("auth_login", "user-1")).rejects.toThrow(RateLimitError);
  });

  it("isolates rate limits between different users", async () => {
    await limiter.hit("messages", "user-1");
    await limiter.hit("messages", "user-1");
    await limiter.hit("messages", "user-1");

    // user-1 is maxed out
    await expect(limiter.hit("messages", "user-1")).rejects.toThrow(RateLimitError);

    // user-2 should still be allowed
    await expect(limiter.hit("messages", "user-2")).resolves.toBeUndefined();
    expect(limiter.getHitCount("messages", "user-2")).toBe(1);
  });

  it("resets count after window expires", async () => {
    vi.useFakeTimers();
    try {
      await limiter.hit("messages", "user-1");
      await limiter.hit("messages", "user-1");
      await limiter.hit("messages", "user-1");

      // Advance clock past 1000ms window
      vi.advanceTimersByTime(1050);

      expect(limiter.getHitCount("messages", "user-1")).toBe(0);
      await expect(limiter.hit("messages", "user-1")).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("allows manual reset of rate limits", async () => {
    await limiter.hit("messages", "user-1");
    await limiter.hit("messages", "user-1");
    await limiter.hit("messages", "user-1");

    limiter.reset("messages", "user-1");
    expect(limiter.getHitCount("messages", "user-1")).toBe(0);

    await expect(limiter.hit("messages", "user-1")).resolves.toBeUndefined();
  });
});
