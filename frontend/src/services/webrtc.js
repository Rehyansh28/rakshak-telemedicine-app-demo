export class WebRTCConnection {
  constructor(iceServers, onSignal, onRemoteStream, onConnectionStateChange, onIceConnectionStateChange) {
    // Default STUN server as required
    this.iceServers = iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
    this.onSignal = onSignal;
    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;
    this.onIceConnectionStateChange = onIceConnectionStateChange;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.iceCandidatesQueue = []; // Queue incoming ICE candidates until remote description is set
  }

  logConnectionStates() {
    if (!this.peerConnection) return;
    console.log(`[WebRTC Diagnostic States] \n      connectionState: ${this.peerConnection.connectionState}\n      iceConnectionState: ${this.peerConnection.iceConnectionState}\n      signalingState: ${this.peerConnection.signalingState}\n      iceGatheringState: ${this.peerConnection.iceGatheringState}`);
  }

  initialize(localStream) {
    console.warn('Initializing WebRTC peer connection...');
    console.warn('[WebRTC] Configuring peer connection with iceServers:', JSON.stringify(this.iceServers));
    this.localStream = localStream;
    
    // Create RTCPeerConnection instance
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    // Add local tracks to send to the remote peer
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

    // ICE candidates handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.warn('[WebRTC] ICE Candidate Generated:', event.candidate.candidate);
        this.onSignal({
          type: 'candidate',
          candidate: event.candidate,
        });
      }
    };

    // Track handler (receive remote stream)
    this.peerConnection.ontrack = (event) => {
      console.warn('[WebRTC] Track received:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      this.remoteStream.addTrack(event.track);
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // State change logging
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.connectionState : 'closed';
      console.warn('[WebRTC] Connection State changed:', state);
      this.logConnectionStates();
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.iceConnectionState : 'closed';
      console.warn('[WebRTC] ICE Connection State changed:', state);
      this.logConnectionStates();
      if (this.onIceConnectionStateChange) {
        this.onIceConnectionStateChange(state);
      }
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.warn('[WebRTC] Signaling State changed:', this.peerConnection ? this.peerConnection.signalingState : 'closed');
      this.logConnectionStates();
    };
  }

  async createOffer() {
    if (!this.peerConnection) {
      console.error('[WebRTC] Cannot createOffer. PeerConnection is not initialized.');
      return;
    }
    try {
      console.warn('[WebRTC] createOffer called');
      const offer = await this.peerConnection.createOffer();
      console.warn('[WebRTC] setLocalDescription success');
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
        console.warn('[WebRTC] Offer received, setting remote description...');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
          type: 'offer',
          sdp: signal.sdp,
        }));
        console.warn('[WebRTC] setRemoteDescription success (type: offer)');
        
        // Process queued ICE candidates
        if (this.iceCandidatesQueue.length > 0) {
          console.warn(`[WebRTC] Processing ${this.iceCandidatesQueue.length} queued ICE candidates...`);
          for (const cand of this.iceCandidatesQueue) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
              console.warn('[WebRTC] ICE Candidate Added successfully from queue');
            } catch (err) {
              console.error('[WebRTC] Failed to add queued ICE candidate', err, cand);
            }
          }
          this.iceCandidatesQueue = [];
        }

        console.warn('[WebRTC] createAnswer called');
        const answer = await this.peerConnection.createAnswer();
        console.warn('[WebRTC] setLocalDescription success (answer)');
        await this.peerConnection.setLocalDescription(answer);
        this.onSignal({
          type: 'answer',
          sdp: answer.sdp,
        });
      } else if (signal.type === 'answer') {
        console.warn('[WebRTC] Answer received, setting remote description...');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: signal.sdp,
        }));
        console.warn('[WebRTC] setRemoteDescription success (type: answer)');

        // Process queued ICE candidates
        if (this.iceCandidatesQueue.length > 0) {
          console.warn(`[WebRTC] Processing ${this.iceCandidatesQueue.length} queued ICE candidates...`);
          for (const cand of this.iceCandidatesQueue) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
              console.warn('[WebRTC] ICE Candidate Added successfully from queue');
            } catch (err) {
              console.error('[WebRTC] Failed to add queued ICE candidate', err, cand);
            }
          }
          this.iceCandidatesQueue = [];
        }
      } else if (signal.type === 'candidate') {
        if (signal.candidate) {
          console.warn('[WebRTC] ICE Candidate Received:', signal.candidate.candidate);
          if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
              console.warn('[WebRTC] ICE Candidate Added successfully');
            } catch (err) {
              console.error('[WebRTC] Failed to add ICE candidate', err, signal.candidate);
            }
          } else {
            console.warn('[WebRTC] Queuing ICE candidate (remoteDescription not set yet)');
            this.iceCandidatesQueue.push(signal.candidate);
          }
        }
      }
    } catch (e) {
      console.error('[WebRTC] Error occurred while handling signal payload', e, signal);
    }
  }

  close() {
    console.log('[WebRTC] Closing WebRTC peer connection');
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.iceCandidatesQueue = [];
  }
}
