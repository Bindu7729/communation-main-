export interface IceCandidatePayload {
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

export function isRelayCandidate(candidateStr: string): boolean {
  if (!candidateStr) return false;
  return candidateStr.includes(' typ relay ');
}

export function prioritizeIceCandidates(candidates: IceCandidatePayload[]): IceCandidatePayload[] {
  // Direct host and srflx candidates preferred over relay to minimize TURN latency
  return [...candidates].sort((a, b) => {
    const aRelay = isRelayCandidate(a.candidate);
    const bRelay = isRelayCandidate(b.candidate);
    if (aRelay === bRelay) return 0;
    return aRelay ? 1 : -1;
  });
}
