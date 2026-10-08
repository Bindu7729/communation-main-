import { describe, it, expect } from 'vitest';
import { isMessageExpired, calculateRemainingTTL } from '../../src/lib/messageExpiryPolicy';

describe('Message Expiry Policy Utility', () => {
  it('treats messages without TTL as permanent', () => {
    expect(isMessageExpired(undefined)).toBe(false);
    expect(calculateRemainingTTL(undefined)).toBe(Infinity);
  });

  it('correctly calculates remaining TTL and flags expired messages', () => {
    const now = 1700000000000;
    const policy = { ttlSeconds: 60, createdAt: now - 30000 }; // 30s elapsed of 60s

    expect(isMessageExpired(policy, now)).toBe(false);
    expect(calculateRemainingTTL(policy, now)).toBe(30);

    const expiredPolicy = { ttlSeconds: 60, createdAt: now - 70000 }; // 70s elapsed
    expect(isMessageExpired(expiredPolicy, now)).toBe(true);
    expect(calculateRemainingTTL(expiredPolicy, now)).toBe(0);
  });
});
