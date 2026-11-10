export interface RatchetState {
  sequenceNumber: number;
  rotationInterval: number; // e.g. every 50 messages
  lastRotatedAt: number; // epoch ms
  needsRotation: boolean;
}

export function shouldRotateSessionKey(
  sequenceNumber: number,
  lastRotatedAt: number,
  rotationInterval: number = 50,
  maxAgeMs: number = 7 * 24 * 3600 * 1000 // 7 days
): boolean {
  if (sequenceNumber > 0 && sequenceNumber % rotationInterval === 0) {
    return true;
  }
  const age = Date.now() - lastRotatedAt;
  return age >= maxAgeMs;
}

export function stepRatchetSequence(state: RatchetState): RatchetState {
  const nextSeq = state.sequenceNumber + 1;
  const needsRotation = shouldRotateSessionKey(nextSeq, state.lastRotatedAt, state.rotationInterval);

  return {
    ...state,
    sequenceNumber: nextSeq,
    needsRotation
  };
}
