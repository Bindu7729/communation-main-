import { describe, it, expect } from 'vitest';
import { shouldRotateSessionKey, stepRatchetSequence } from '../../src/lib/sessionKeyRotation';

describe('Session Key Ratchet Rotation Utility', () => {
  it('triggers rotation when sequence reaches interval threshold', () => {
    const now = Date.now();
    expect(shouldRotateSessionKey(50, now, 50)).toBe(true);
    expect(shouldRotateSessionKey(25, now, 50)).toBe(false);
  });

  it('triggers rotation when key age exceeds max threshold', () => {
    const eightDaysAgo = Date.now() - (8 * 24 * 3600 * 1000);
    expect(shouldRotateSessionKey(1, eightDaysAgo, 50)).toBe(true);
  });

  it('advances sequence number and sets rotation flag when stepped', () => {
    const initial = {
      sequenceNumber: 49,
      rotationInterval: 50,
      lastRotatedAt: Date.now(),
      needsRotation: false
    };

    const next = stepRatchetSequence(initial);
    expect(next.sequenceNumber).toBe(50);
    expect(next.needsRotation).toBe(true);
  });
});
