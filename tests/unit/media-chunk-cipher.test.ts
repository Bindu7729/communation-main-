import { describe, it, expect } from 'vitest';
import { computeChunkHash, verifyChunkIntegrity } from '../../src/lib/mediaChunkCipher';

describe('Media Chunk Cipher & Integrity Utility', () => {
  it('computes deterministic SHA-256 chunk hash', () => {
    const data = Buffer.from('Ghostline Encrypted Audio Payload Data');
    const hashA = computeChunkHash(data, 0);
    const hashB = computeChunkHash(data, 0);

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });

  it('validates matching chunk hashes and rejects tampered bytes', () => {
    const data = Buffer.from('Original Media Chunk');
    const validHash = computeChunkHash(data, 1);

    expect(verifyChunkIntegrity(data, 1, validHash)).toBe(true);

    const tampered = Buffer.from('Tampered Media Chunk');
    expect(verifyChunkIntegrity(tampered, 1, validHash)).toBe(false);
  });
});
