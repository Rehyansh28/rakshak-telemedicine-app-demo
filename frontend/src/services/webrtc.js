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
    console.log(`[WebRTC Diagnostic States] 
      connectionState: ${this.peerConnection.connectionState}
      iceConnectionState: ${this.peerConnection.iceConnectionState}
      signalingState: ${this.peerConnection.signalingState}
      iceGatheringState: ${this.peerConnection.iceGatheringState}`);
  }

  initialize(localStream) {
    console.log('Initializing WebRTC peer connection...');
    this.localStream = localStream;
    
    // Create RTCPeerConnection instance
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    // Add local tracks to send to the remote peer
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        console.log(`Adding local track: ${track.kind} to connection`);
        this.peerConnection.addTrack(track, this.localStream);
      });
    } else {
      console.warn('Initializing WebRTC connection without a local stream');
    }

    // ICE candidates handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignal({
          type: 'candidate',
          candidate: event.candidate,
        });
      }
    };

    // Remote stream track handler with fallback support
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track', event.streams);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream(event.streams[0]);
      } else {
        console.log('Fallback: Creating new MediaStream from received track');
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
          this.onRemoteStream(this.remoteStream);
        }
        this.remoteStream.addTrack(event.track);
      }
    };

    // Peer connection state listeners
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.connectionState : 'closed';
      console.log('WebRTC Connection State changed:', state);
      this.logConnectionStates();
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.iceConnectionState : 'closed';
      console.log('WebRTC ICE Connection State changed:', state);
      this.logConnectionStates();
      if (this.onIceConnectionStateChange) {
        this.onIceConnectionStateChange(state);
      }
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log('WebRTC Signaling State changed:', this.peerConnection?.signalingState);
      this.logConnectionStates();
    };

    this.peerConnection.onicegatheringstatechange = () => {
      console.log('WebRTC ICE Gathering State changed:', this.peerConnection?.iceGatheringState);
      this.logConnectionStates();
    };
  }

  async createOffer() {
    if (!this.peerConnection) {
      console.error('Cannot create offer. PeerConnection is not initialized.');
      return;
    }
    try {
      console.log('Creating WebRTC SDP offer...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.onSignal({
        type: 'offer',
        sdp: offer.sdp,
      });
    } catch (e) {
      console.error('Failed to create and set SDP offer', e);
    }
  }

  async handleSignal(signal) {
    if (!this.peerConnection) {
      console.error('Cannot handle signal. PeerConnection is not initialized.');
      return;
    }

    try {
      console.log(`Handling WebRTC signal: ${signal.type}`);
      if (signal.type === 'offer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
          type: 'offer',
          sdp: signal.sdp,
        }));
        
        // Process queued ICE candidates
        if (this.iceCandidatesQueue.length > 0) {
          console.log(`Processing ${this.iceCandidatesQueue.length} queued ICE candidates...`);
          for (const cand of this.iceCandidatesQueue) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
          }
          this.iceCandidatesQueue = [];
        }

        console.log('Creating SDP answer...');
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.onSignal({
          type: 'answer',
          sdp: answer.sdp,
        });
      } else if (signal.type === 'answer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: signal.sdp,
        }));

        // Process queued ICE candidates
        if (this.iceCandidatesQueue.length > 0) {
          console.log(`Processing ${this.iceCandidatesQueue.length} queued ICE candidates...`);
          for (const cand of this.iceCandidatesQueue) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
          }
          this.iceCandidatesQueue = [];
        }
      } else if (signal.type === 'candidate') {
        if (signal.candidate) {
          if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            console.log('Queuing ICE candidate (remoteDescription not set yet)');
            this.iceCandidatesQueue.push(signal.candidate);
          }
        }
      }
    } catch (e) {
      console.error('Error occurred while handling signal payload', e, signal);
    }
  }

  close() {
    console.log('Closing WebRTC peer connection');
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.iceCandidatesQueue = [];
  }
}
