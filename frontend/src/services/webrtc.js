function serializeIceCandidate(candidate) {
  if (!candidate) return null;
  if (typeof candidate.toJSON === 'function') {
    return candidate.toJSON();
  }
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment,
  };
}

function normalizeRtcConfig(config) {
  const fallback = [{ urls: 'stun:stun.l.google.com:19302' }];

  if (!config) {
    return { iceServers: fallback };
  }

  // Support legacy callers that passed the iceServers array directly.
  if (Array.isArray(config)) {
    return { iceServers: config };
  }

  const rawServers = config.iceServers;
  const iceServers = Array.isArray(rawServers) ? rawServers : fallback;

  const normalized = {
    iceServers: iceServers.map((server) => {
      const entry = { urls: server.urls };
      if (server.username) entry.username = String(server.username);
      if (server.credential) entry.credential = String(server.credential);
      return entry;
    }),
  };

  if (typeof config.iceCandidatePoolSize === 'number') {
    normalized.iceCandidatePoolSize = config.iceCandidatePoolSize;
  }
  if (config.bundlePolicy) {
    normalized.bundlePolicy = config.bundlePolicy;
  }
  if (config.iceTransportPolicy) {
    normalized.iceTransportPolicy = config.iceTransportPolicy;
  }

  return normalized;
}

export class WebRTCConnection {
  constructor(
    rtcConfig,
    onSignal,
    onRemoteStream,
    onConnectionStateChange,
    onIceConnectionStateChange,
    onNegotiationNeeded,
  ) {
    this.rtcConfig = normalizeRtcConfig(rtcConfig);
    this.onSignal = onSignal;
    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;
    this.onIceConnectionStateChange = onIceConnectionStateChange;
    this.onNegotiationNeeded = onNegotiationNeeded;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.iceCandidatesQueue = [];
    this.relayRetryAttempted = false;
  }

  emitRemoteStream() {
    if (!this.remoteStream || !this.onRemoteStream) return;
    this.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
  }

  logConnectionStates() {
    if (!this.peerConnection) return;
    console.log(
      `[WebRTC Diagnostic States]
      connectionState: ${this.peerConnection.connectionState}
      iceConnectionState: ${this.peerConnection.iceConnectionState}
      signalingState: ${this.peerConnection.signalingState}
      iceGatheringState: ${this.peerConnection.iceGatheringState}`,
    );
  }

  initialize(localStream) {
    console.warn('[WebRTC] Initializing peer connection...', this.rtcConfig);
    this.localStream = localStream;
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        console.warn(`[WebRTC] Adding local track: ${track.kind}`);
        try {
          this.peerConnection.addTrack(track, this.localStream);
        } catch (e) {
          console.error('[WebRTC] Failed to add track:', track.kind, e);
        }
      });
    }

    this.peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      console.warn('[WebRTC] ICE candidate generated:', event.candidate.candidate);
      this.onSignal({
        type: 'candidate',
        candidate: serializeIceCandidate(event.candidate),
      });
    };

    this.peerConnection.ontrack = (event) => {
      console.warn('[WebRTC] Track received:', event.track.kind);
      const incomingStream = event.streams?.[0];
      if (incomingStream) {
        this.remoteStream = incomingStream;
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
      }
      this.emitRemoteStream();
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.connectionState : 'closed';
      console.warn('[WebRTC] Connection state changed:', state);
      this.logConnectionStates();
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.iceConnectionState : 'closed';
      console.warn('[WebRTC] ICE connection state changed:', state);
      this.logConnectionStates();
      if (this.onIceConnectionStateChange) {
        this.onIceConnectionStateChange(state);
      }
      if (state === 'connected' || state === 'completed') {
        this.emitRemoteStream();
      }
      if (state === 'failed' && this.onNegotiationNeeded) {
        this.onNegotiationNeeded('ice-failed');
      }
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.warn(
        '[WebRTC] Signaling state changed:',
        this.peerConnection ? this.peerConnection.signalingState : 'closed',
      );
      this.logConnectionStates();
    };
  }

  reinitializeWithRelayOnly(localStream) {
    console.warn('[WebRTC] Retrying with TURN relay-only transport...');
    this.close(false);
    this.relayRetryAttempted = true;
    this.rtcConfig = normalizeRtcConfig({
      ...this.rtcConfig,
      iceTransportPolicy: 'relay',
    });
    this.initialize(localStream);
  }

  async createOffer({ iceRestart = false } = {}) {
    if (!this.peerConnection) {
      console.error('[WebRTC] Cannot createOffer. PeerConnection is not initialized.');
      return;
    }
    try {
      console.warn('[WebRTC] createOffer called', { iceRestart });
      const offer = await this.peerConnection.createOffer({ iceRestart });
      await this.peerConnection.setLocalDescription(offer);
      this.onSignal({
        type: 'offer',
        sdp: offer.sdp,
      });
    } catch (e) {
      console.error('[WebRTC] Failed to create and set SDP offer', e);
    }
  }

  async handleSignal(signal) {
    if (!this.peerConnection) {
      console.warn('[WebRTC] Signal received but PeerConnection is not initialized yet.', signal);
      return;
    }

    try {
      if (signal.type === 'offer') {
        if (
          this.peerConnection.iceConnectionState === 'failed' ||
          this.peerConnection.connectionState === 'failed'
        ) {
          const stream = this.localStream;
          this.close(false);
          this.initialize(stream);
        }

        console.warn('[WebRTC] Offer received, setting remote description...');
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription({
            type: 'offer',
            sdp: signal.sdp,
          }),
        );
        await this.flushIceCandidateQueue();

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.onSignal({
          type: 'answer',
          sdp: answer.sdp,
        });
      } else if (signal.type === 'answer') {
        console.warn('[WebRTC] Answer received, setting remote description...');
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription({
            type: 'answer',
            sdp: signal.sdp,
          }),
        );
        await this.flushIceCandidateQueue();
      } else if (signal.type === 'candidate' && signal.candidate) {
        console.warn('[WebRTC] ICE candidate received:', signal.candidate.candidate);
        if (this.peerConnection.remoteDescription?.type) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
            console.warn('[WebRTC] ICE candidate added successfully');
          } catch (err) {
            console.error('[WebRTC] Failed to add ICE candidate', err, signal.candidate);
          }
        } else {
          console.warn('[WebRTC] Queuing ICE candidate (remoteDescription not set yet)');
          this.iceCandidatesQueue.push(signal.candidate);
        }
      }
    } catch (e) {
      console.error('[WebRTC] Error occurred while handling signal payload', e, signal);
    }
  }

  async flushIceCandidateQueue() {
    if (!this.iceCandidatesQueue.length) return;
    console.warn(`[WebRTC] Processing ${this.iceCandidatesQueue.length} queued ICE candidates...`);
    for (const cand of this.iceCandidatesQueue) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.error('[WebRTC] Failed to add queued ICE candidate', err, cand);
      }
    }
    this.iceCandidatesQueue = [];
  }

  close(resetRelayRetry = true) {
    console.log('[WebRTC] Closing WebRTC peer connection');
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.iceCandidatesQueue = [];
    if (resetRelayRetry) {
      this.relayRetryAttempted = false;
    }
  }
}
