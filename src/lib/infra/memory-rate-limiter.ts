import { RateLimitError } from "@/lib/domain/errors";
import type { RateLimiter } from "@/lib/ports/rate-limit";

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, number[]>();

  constructor(
    private readonly defaultOptions: RateLimitOptions = {
      windowMs: 60_000,
      maxRequests: 60,
    },
    private readonly bucketOptions: Record<string, RateLimitOptions> = {},
  ) {}

  async hit(bucket: string, userId: string): Promise<void> {
    const key = `${bucket}:${userId}`;
    const now = Date.now();
    const options = this.bucketOptions[bucket] ?? this.defaultOptions;
    const cutoff = now - options.windowMs;

    const timestamps = (this.buckets.get(key) ?? []).filter((ts) => ts > cutoff);

    if (timestamps.length >= options.maxRequests) {
      throw new RateLimitError(`Too many requests for ${bucket}. Please try again shortly.`);
    }

    timestamps.push(now);
    this.buckets.set(key, timestamps);
  }

  getHitCount(bucket: string, userId: string): number {
    const key = `${bucket}:${userId}`;
    const now = Date.now();
    const options = this.bucketOptions[bucket] ?? this.defaultOptions;
    const cutoff = now - options.windowMs;
    const timestamps = (this.buckets.get(key) ?? []).filter((ts) => ts > cutoff);
    return timestamps.length;
  }

  reset(bucket?: string, userId?: string): void {
    if (bucket && userId) {
      this.buckets.delete(`${bucket}:${userId}`);
    } else {
      this.buckets.clear();
    }
  }
}
