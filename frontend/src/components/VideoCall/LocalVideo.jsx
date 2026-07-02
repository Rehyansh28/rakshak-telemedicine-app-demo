import { useEffect, useRef } from 'react';
import { VideoOff } from 'lucide-react';

export default function LocalVideo({ stream, videoOn = true, className = '' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream && videoOn) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoOn]);

  return (
    <div className={`relative aspect-video rounded-lg overflow-hidden bg-primary-container/20 border border-outline-variant/30 ${className}`}>
      {videoOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant/70">
          <VideoOff className="w-6 h-6 text-on-surface-variant/40" />
          <p className="label-caps text-[9px]">Camera Off</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 z-10 glass-panel px-2 py-0.5 rounded text-[9px] text-on-surface-variant font-medium">
        You (Local)
      </div>
    </div>
  );
}
