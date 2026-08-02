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
    this.pingInterval = null;
    this.messageQueue = [];
  }

  flushQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.ws.send(JSON.stringify(message));
    }
  }

  connect() {
    this.isClosedIntentional = false;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close();
      } catch (e) {
        console.error('Error closing old WebSocket connection', e);
      }
      this.ws = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = import.meta.env.VITE_WS_HOST;
    if (!host) {
      host = window.location.host;
    }

    const url = `${protocol}//${host}/ws/call/${this.roomId}/?token=${this.token}`;
    console.warn(`[WebSocket] Connecting to signaling url: ${url}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.warn('[WebSocket] Connected successfully');
        this.reconnectAttempts = 0;
        this.flushQueue();

        this.pingInterval = setInterval(() => {
          this.send({ type: 'ping' });
        }, 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping' || data.type === 'pong') return;
          console.log('[WebSocket] Message received:', data);
          if (this.onMessage) this.onMessage(data);
        } catch (e) {
          console.error('[WebSocket] Failed to parse message data:', e, event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected. Code: ${event.code}, Reason: ${event.reason || 'None'}`);

        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        if (this.onClose) this.onClose(event);

        if (!this.isClosedIntentional && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts += 1;
          console.log(`[WebSocket] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error occurred:', error);
        if (this.onError) this.onError(error);
      };
    } catch (err) {
      console.error('[WebSocket] Failed to establish connection:', err);
      if (this.onError) this.onError(err);
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Message sent:', message.type || message);
      this.ws.send(JSON.stringify(message));
      return;
    }

    console.warn('[WebSocket] Queueing message until socket is open:', message.type || message);
    this.messageQueue.push(message);
  }

  close() {
    this.isClosedIntentional = true;
    this.messageQueue = [];
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      console.log('[WebSocket] Closing connection intentionally');
      this.ws.close();
      this.ws = null;
    }
  }
}
