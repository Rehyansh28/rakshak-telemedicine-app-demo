export class SignalingService {
  constructor(roomId, token, onMessage, onClose, onError) {
    this.roomId = roomId;
    this.token = token;
    this.onMessage = onMessage;
    this.onClose = onClose;
    this.onError = onError;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isClosedIntentional = false;
  }

  connect() {
    this.isClosedIntentional = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // In local development, the backend runs on port 8000 (usually localhost:8000).
    // Let's resolve the host: if VITE_WS_HOST is set, use it. Otherwise, if the app is on port 5555/8555/etc,
    // default to localhost:8000 for backend services.
    let host = import.meta.env.VITE_WS_HOST;
    if (!host) {
      const locHost = window.location.hostname;
      host = `${locHost}:8000`;
    }

    const url = `${protocol}//${host}/ws/call/${this.roomId}/?token=${this.token}`;
    
    console.log(`Connecting to signaling WebSocket: ${url}`);
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('Signaling WebSocket connected successfully');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessage) this.onMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message data', e);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`Signaling WebSocket closed. Code: ${event.code}`);
        if (this.onClose) this.onClose(event);
        
        // Reconnect if connection was lost unintentionally
        if (!this.isClosedIntentional && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Signaling WebSocket error occurred', error);
        if (this.onError) this.onError(error);
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection', err);
      if (this.onError) this.onError(err);
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message. WebSocket is not in OPEN state.', message);
    }
  }

  close() {
    this.isClosedIntentional = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
