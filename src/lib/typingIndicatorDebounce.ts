export function shouldBroadcastTyping(
  lastSentTimestamp: number,
  currentTime: number = Date.now(),
  throttleMs: number = 3000
): boolean {
  return currentTime - lastSentTimestamp >= throttleMs;
}
