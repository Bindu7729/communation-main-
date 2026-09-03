import { describe, it, expect } from 'vitest';
import { determinePresenceState } from '../../src/lib/userStatusPresence';

describe('User Presence State Machine', () => {
  it('classifies recently active users as online', () => {
    const now = 1700000000000;
    expect(determinePresenceState(now - 15000, now)).toBe('online');
  });

  it('classifies idle users between 1 and 5 minutes as away', () => {
    const now = 1700000000000;
    expect(determinePresenceState(now - 120000, now)).toBe('away');
  });

  it('classifies inactive users over 5 minutes as offline', () => {
    const now = 1700000000000;
    expect(determinePresenceState(now - 600000, now)).toBe('offline');
  });
});
