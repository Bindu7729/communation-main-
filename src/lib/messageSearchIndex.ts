export interface IndexedMessage {
  id: string;
  senderId: string;
  plaintext: string;
  timestamp: number;
}

export function searchLocalMessages(messages: IndexedMessage[], query: string): IndexedMessage[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();

  return messages
    .filter(m => m.plaintext.toLowerCase().includes(q))
    .sort((a, b) => b.timestamp - a.timestamp);
}
