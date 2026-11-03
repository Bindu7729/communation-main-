import { createHash } from 'crypto';

export interface ChunkVerification {
  chunkIndex: number;
  totalChunks: number;
  hash: string;
  isValid: boolean;
}

export function computeChunkHash(chunk: Buffer | Uint8Array, chunkIndex: number): string {
  const hasher = createHash('sha256');
  hasher.update(Buffer.from([chunkIndex >> 24, chunkIndex >> 16, chunkIndex >> 8, chunkIndex & 0xff]));
  hasher.update(chunk);
  return hasher.digest('hex');
}

export function verifyChunkIntegrity(
  chunk: Buffer | Uint8Array,
  chunkIndex: number,
  expectedHash: string
): boolean {
  if (!chunk || !expectedHash) return false;
  const computed = computeChunkHash(chunk, chunkIndex);
  return computed === expectedHash;
}
