export type PresenceStatus = 'online' | 'away' | 'offline';

export function determinePresenceState(lastActiveEpochMs: number, currentTimeMs: number = Date.now()): PresenceStatus {
  const elapsed = currentTimeMs - lastActiveEpochMs;
  if (elapsed < 60000) return 'online'; // Under 1 min
  if (elapsed < 300000) return 'away'; // 1-5 mins
  return 'offline'; // Over 5 mins
}
