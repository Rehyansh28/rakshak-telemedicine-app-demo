import { useState, useEffect } from 'react';

export default function CallTimer({ startTime }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = startTime ? new Date(startTime).getTime() : Date.now();
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000);
      setSeconds(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="font-mono text-xs font-bold text-on-surface-variant flex items-center gap-1.5 glass-panel px-3 py-1.5 rounded-lg select-none">
      <span className="w-1.5 h-1.5 bg-error rounded-full animate-ping" />
      <span>{formatTime(seconds)}</span>
    </div>
  );
}
