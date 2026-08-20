import { describe, it, expect } from 'vitest';
import { calculateTotalUnreadCount, formatBadgeDisplay } from '../../src/lib/unreadBadgeCounter';

describe('Unread Badge Counter Utility', () => {
  it('sums unread counts across all active conversations', () => {
    const list = [{ unreadCount: 3 }, { unreadCount: 0 }, { unreadCount: 7 }];
    expect(calculateTotalUnreadCount(list)).toBe(10);
    expect(formatBadgeDisplay(10)).toBe('10');
  });

  it('formats large counts exceeding 99 as 99+', () => {
    expect(formatBadgeDisplay(150)).toBe('99+');
    expect(formatBadgeDisplay(0)).toBe('');
  });
});
