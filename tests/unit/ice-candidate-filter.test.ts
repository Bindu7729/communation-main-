import { describe, it, expect } from 'vitest';
import { isRelayCandidate, prioritizeIceCandidates } from '../../src/lib/iceCandidateFilter';

describe('WebRTC ICE Candidate Filter', () => {
  it('detects TURN relay candidate strings', () => {
    const relay = 'candidate:1 1 UDP 2122260223 192.168.1.1 50000 typ relay raddr ...';
    const host = 'candidate:2 1 UDP 2122260223 192.168.1.1 50000 typ host';

    expect(isRelayCandidate(relay)).toBe(true);
    expect(isRelayCandidate(host)).toBe(false);
  });

  it('sorts direct candidates before relay candidates for reduced latency', () => {
    const list = [
      { candidate: 'candidate:1 1 typ relay ' },
      { candidate: 'candidate:2 1 typ host ' }
    ];
    const prioritized = prioritizeIceCandidates(list);
    expect(prioritized[0].candidate).toContain('typ host');
    expect(prioritized[1].candidate).toContain('typ relay');
  });
});
