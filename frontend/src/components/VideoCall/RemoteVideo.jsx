import { useEffect, useRef } from 'react';
import { Video, AlertCircle } from 'lucide-react';

export default function RemoteVideo({ stream, isConnecting, isDisconnected, label = 'Remote Link' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full min-h-[280px] bg-primary-container/10">
      {stream && !isDisconnected ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : null}

      {/* Connection Loss Overlay */}
      {isDisconnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center z-10 bg-error/10 backdrop-blur-sm">
          <AlertCircle className="w-12 h-12 text-error animate-pulse" />
          <p className="font-sora text-sm font-bold text-error">Connection Lost</p>
          <p className="text-xs text-on-surface-variant max-w-xs">
            Attempting to re-establish the connection. Please wait...
          </p>
        </div>
      )}

      {/* Starting/Connecting state overlay */}
      {(!stream || isConnecting) && !isDisconnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant/80 z-[1]">
          <Video className="w-12 h-12 animate-pulse text-secondary" />
          <p className="label-caps text-xs">Waiting for video stream…</p>
        </div>
      )}

      {/* Floating identity label */}
      <div className="absolute bottom-4 left-4 z-10 glass-panel px-3 py-1.5 rounded-lg max-w-[220px]">
        <p className="label-caps text-[10px] text-secondary">Remote Connection</p>
        <p className="text-xs text-on-surface-variant truncate font-semibold">{label}</p>
      </div>
    </div>
  );
}
