import { describe, it, expect } from 'vitest';
import { shouldBroadcastTyping } from '../../src/lib/typingIndicatorDebounce';

describe('Typing Indicator Throttler', () => {
  it('throttles rapid sequential typing event broadcasts', () => {
    const now = 1700000000000;
    expect(shouldBroadcastTyping(now - 1000, now, 3000)).toBe(false);
    expect(shouldBroadcastTyping(now - 3500, now, 3000)).toBe(true);
  });
});
