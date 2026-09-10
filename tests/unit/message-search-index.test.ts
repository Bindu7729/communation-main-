import { describe, it, expect } from 'vitest';
import { searchLocalMessages } from '../../src/lib/messageSearchIndex';

describe('Local Message Search Utility', () => {
  const messages = [
    { id: '1', senderId: 'u1', plaintext: 'Are we meeting for the project review?', timestamp: 100 },
    { id: '2', senderId: 'u2', plaintext: 'Yes, meeting starts at 3pm sharp.', timestamp: 200 },
    { id: '3', senderId: 'u1', plaintext: 'Sounds great, see you there!', timestamp: 300 }
  ];

  it('finds matching messages and orders by newest timestamp', () => {
    const results = searchLocalMessages(messages, 'meeting');
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('2'); // timestamp 200 before 100
    expect(results[1].id).toBe('1');
  });

  it('returns empty array when no matches or query is empty', () => {
    expect(searchLocalMessages(messages, 'unrelated')).toHaveLength(0);
    expect(searchLocalMessages(messages, '')).toHaveLength(0);
  });
});
