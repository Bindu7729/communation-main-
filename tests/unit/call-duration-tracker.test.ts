import { describe, it, expect } from 'vitest';
import { formatCallDuration } from '../../src/lib/callDurationTracker';

describe('Call Duration Tracker Utility', () => {
  it('formats mm:ss for short and medium length calls', () => {
    expect(formatCallDuration(45)).toBe('00:45');
    expect(formatCallDuration(135)).toBe('02:15');
  });

  it('formats hh:mm:ss when call exceeds one hour', () => {
    expect(formatCallDuration(3665)).toBe('01:01:05');
  });
});
