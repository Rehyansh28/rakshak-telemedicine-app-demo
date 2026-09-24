/**
 * Live sensor data from the Rakshak hub (hub/ folder) - EXPERIMENTAL, not a medical device.
 *
 * The hub streams Server-Sent Events at /live/events (reached through the Vite proxy):
 *   ecg      raw ECG samples, 10 chunks per second  -> kept in a ring buffer, never in React state
 *   summary  once per second: heart rate, electrodes, signal, posture... for every sensor
 *   alert    an alert started or ended
 * One shared connection for the whole app, opened while at least one component uses it.
 */

const HUB_URL = import.meta.env.VITE_HUB_URL || '/live';
const ECG_SECONDS = 10;
const RETRY_MS = 3000;

class EcgBuffer {
  constructor(fs) {
    this.fs = fs;
    this.size = Math.round(fs * ECG_SECONDS);
    this.data = new Float32Array(this.size);
    this.total = 0; // samples received so far (the newest is total - 1)
    this.lastSeq = null;
    this.lastAt = 0; // performance.now() of the newest live (not snapshot) chunk
  }

  push(msg) {
    const { seq, samples } = msg;
    if (typeof seq === 'number' && this.lastSeq !== null && seq <= this.lastSeq && this.lastSeq - seq < 100) {
      return; // already have it (e.g. sent again after a reconnect)
    }
    if (typeof seq === 'number') this.lastSeq = seq;
    for (const value of samples) {
      this.data[this.total % this.size] = value;
      this.total += 1;
    }
    if (!msg.snapshot) this.lastAt = performance.now();
  }

  /** Sample number i (must be between total - size and total - 1). */
  at(i) {
    return this.data[i % this.size];
  }
}

class HubStream {
  constructor() {
    this.users = 0;
    this.source = null;
    this.retryTimer = null;
    this.connection = 'offline'; // 'connecting' | 'open' | 'offline'
    this.devices = new Map(); // soldierId -> latest device summary
    this.lastSummaryAt = 0; // Date.now() of the latest summary
    this.ecg = new Map(); // soldierId -> EcgBuffer
    this.listeners = new Set();
    this.alertListeners = new Set();
  }

  /** Keep the connection open while the caller needs it. Returns a release function. */
  use() {
    this.users += 1;
    if (this.users === 1) this.connect();
    return () => {
      this.users -= 1;
      if (this.users === 0) this.disconnect();
    };
  }

  /** Called on every summary / connection change. Returns an unsubscribe function. */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Called for every alert event from the hub. Returns an unsubscribe function. */
  onAlert(listener) {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  getEcg(soldierId) {
    return soldierId ? this.ecg.get(soldierId) : undefined;
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }

  setConnection(state) {
    if (this.connection !== state) {
      this.connection = state;
      this.notify();
    }
  }

  connect() {
    clearTimeout(this.retryTimer);
    this.setConnection('connecting');
    const source = new EventSource(`${HUB_URL}/events`);
    this.source = source;
    source.onopen = () => this.setConnection('open');
    source.onmessage = (event) => {
      try {
        this.handle(JSON.parse(event.data));
      } catch {
        /* ignore a broken message */
      }
    };
    source.onerror = () => {
      this.setConnection('offline');
      // The browser retries by itself, except when the hub was not reachable at all.
      if (source.readyState === EventSource.CLOSED) {
        source.close();
        this.source = null;
        if (this.users > 0) this.retryTimer = setTimeout(() => this.connect(), RETRY_MS);
      }
    };
  }

  disconnect() {
    clearTimeout(this.retryTimer);
    if (this.source) this.source.close();
    this.source = null;
    this.setConnection('offline');
  }

  handle(msg) {
    if (msg.type === 'ecg') {
      const key = msg.soldierId || msg.dev;
      let buffer = this.ecg.get(key);
      if (!buffer || buffer.fs !== (msg.fs || 250)) {
        buffer = new EcgBuffer(msg.fs || 250);
        this.ecg.set(key, buffer);
      }
      buffer.push(msg);
    } else if (msg.type === 'summary') {
      this.devices = new Map((msg.devices || []).map((d) => [d.soldierId || d.dev, d]));
      this.lastSummaryAt = Date.now();
      this.notify();
    } else if (msg.type === 'alert') {
      this.alertListeners.forEach((listener) => listener(msg));
    }
  }
}

export const hubStream = new HubStream();
