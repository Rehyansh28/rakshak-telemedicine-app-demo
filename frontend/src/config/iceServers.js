// STUN discovers public IPs; TURN relays media when peers are on different networks/NATs.
// Use one url per entry for maximum browser compatibility (some reject urls: string[]).
const TURN_USER = 'openrelayproject';
const TURN_PASS = 'openrelayproject';

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: TURN_USER, credential: TURN_PASS },
  { urls: 'turn:openrelay.metered.ca:443', username: TURN_USER, credential: TURN_PASS },
  { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: TURN_USER, credential: TURN_PASS },
];

export function buildRtcConfig({ relayOnly = false } = {}) {
  return {
    iceServers: ICE_SERVERS.map((server) => ({ ...server })),
    iceCandidatePoolSize: 10,
    ...(relayOnly ? { iceTransportPolicy: 'relay' } : {}),
  };
}

export const RTC_PEER_CONFIG = buildRtcConfig();
export const RTC_PEER_RELAY_ONLY_CONFIG = buildRtcConfig({ relayOnly: true });
