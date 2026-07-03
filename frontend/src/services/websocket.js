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
  }

  connect() {
    this.isClosedIntentional = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Close existing socket and clear handlers before creating a new one to prevent duplication
    if (this.ws) {
      console.log('Closing existing WebSocket before reconnecting...');
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
    
    // In local development or tunneling, connect via the same host (Vite proxy or reverse proxy).
    // Let's resolve the host: if VITE_WS_HOST is set, use it. Otherwise, default to the current page host.
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
        
        // Start keepalive ping to prevent idle connection termination (e.g. 45s Cloudflare timeout)
        this.pingInterval = setInterval(() => {
          this.send({ type: 'ping' });
        }, 15000); // 15 seconds is very safe (well below Cloudflare's 45s threshold)
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
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
        
        // Reconnect if connection was lost unintentionally
        if (!this.isClosedIntentional && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
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
      console.log('[WebSocket] Message sent:', message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message. WebSocket is not in OPEN state.', message);
    }
  }

  close() {
    this.isClosedIntentional = true;
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

