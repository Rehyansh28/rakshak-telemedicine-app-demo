import { useEffect, useRef } from 'react';
import { hubStream } from '../../services/hubStream';

// Live ECG from the hub, drawn on a canvas (EXPERIMENTAL, raw AD8232 signal).
// Samples arrive in chunks of 25 (10x per second). To scroll smoothly, the graph plays
// them back slightly behind real time at exactly the sample rate, and only redraws once
// per animation frame (never per message). The browser pauses it in hidden tabs.

const DELAY_S = 0.3; // play this far behind the newest sample, so chunks arrive in time
const MIN_SPAN = 300; // raw ADC counts: do not zoom in further (noise would look like beats)
const LINE = '#00a8b5';
const GRID = 'rgba(0, 74, 99, 0.07)';

function drawGrid(ctx, width, height, seconds) {
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const perSecond = width / seconds;
  for (let x = width; x > 0; x -= perSecond / 5) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, height);
  }
  for (let i = 1; i < 4; i += 1) {
    const y = Math.round((height * i) / 4) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
}

export default function LiveECG({ soldierId, height = 100, seconds = 8, overlay = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const release = hubStream.use();
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let width = 0;
    let heightPx = 0;
    let dpr = 1;
    let pos = null; // playhead: sample number at the right edge (can be fractional)
    let lastTime = performance.now();
    let lo = null;
    let hi = null;
    let dirty = true;
    let lastPos = null;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      heightPx = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(heightPx * dpr));
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (now) => {
      frame = requestAnimationFrame(draw);
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const buffer = hubStream.getEcg(soldierId);

      if (buffer && buffer.total > 0) {
        const fs = buffer.fs;
        const target = buffer.total - fs * DELAY_S;
        if (pos === null || Math.abs(target - pos) > fs) pos = target; // start, gap or hidden tab
        else pos += fs * dt + (target - pos) * 0.02; // real-time speed + gentle catch-up
        pos = Math.min(pos, buffer.total - 1);
      }
      if (!dirty && pos === lastPos) return; // nothing new: skip this frame
      dirty = false;
      lastPos = pos;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, heightPx);
      drawGrid(ctx, width, heightPx, seconds);
      if (!buffer || pos === null) return;

      const n = Math.round(buffer.fs * seconds);
      const oldest = Math.max(0, buffer.total - buffer.size);
      const end = Math.floor(pos);
      const start = Math.max(oldest, Math.ceil(pos - n));
      if (end - start < 2) return;

      // Auto-scale to the visible signal; grow at once, shrink slowly (no jumping).
      let min = Infinity;
      let max = -Infinity;
      for (let i = start; i <= end; i += 1) {
        const v = buffer.at(i);
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (max - min < MIN_SPAN) {
        const mid = (max + min) / 2;
        min = mid - MIN_SPAN / 2;
        max = mid + MIN_SPAN / 2;
      }
      lo = lo === null ? min : Math.min(min, lo + (min - lo) * 0.05);
      hi = hi === null ? max : Math.max(max, hi + (max - hi) * 0.05);
      const pad = (hi - lo) * 0.08;
      const scale = heightPx / (hi - lo + 2 * pad);
      const pxPerSample = width / n;

      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = start; i <= end; i += 1) {
        const x = width - (pos - i) * pxPerSample;
        const y = heightPx - (buffer.at(i) - lo + pad) * scale;
        if (i === start) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      release();
    };
  }, [soldierId, seconds]);

  return (
    <div className="vitals-wave rounded relative" style={{ height }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-label="Live ECG (experimental)" />
      <span className="absolute top-1 left-2 label-caps text-[9px] text-on-surface-variant/80 bg-white/70 px-1 rounded pointer-events-none">
        Live ECG · {seconds}s · experimental
      </span>
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="label-caps text-[10px] text-center px-3 py-1 rounded-full bg-white/90 text-amber-700 border border-amber-400/60 shadow-sm">
            {overlay}
          </span>
        </div>
      )}
    </div>
  );
}
