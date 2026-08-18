export function calculateTotalUnreadCount(conversations: { unreadCount?: number }[]): number {
  if (!Array.isArray(conversations) || conversations.length === 0) return 0;
  return conversations.reduce((sum, c) => sum + Math.max(0, c.unreadCount || 0), 0);
}

export function formatBadgeDisplay(count: number): string {
  if (count <= 0) return '';
  if (count > 99) return '99+';
  return String(count);
}
