export interface EphemeralPolicy {
  ttlSeconds: number;
  createdAt: number; // epoch ms
}

export function isMessageExpired(policy?: EphemeralPolicy, currentTimeMs: number = Date.now()): boolean {
  if (!policy || !policy.ttlSeconds || policy.ttlSeconds <= 0) {
    return false; // Permanent message
  }

  const expiryTimeMs = policy.createdAt + (policy.ttlSeconds * 1000);
  return currentTimeMs >= expiryTimeMs;
}

export function calculateRemainingTTL(policy?: EphemeralPolicy, currentTimeMs: number = Date.now()): number {
  if (!policy || !policy.ttlSeconds || policy.ttlSeconds <= 0) {
    return Infinity;
  }

  const expiryTimeMs = policy.createdAt + (policy.ttlSeconds * 1000);
  const remainingMs = expiryTimeMs - currentTimeMs;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}
