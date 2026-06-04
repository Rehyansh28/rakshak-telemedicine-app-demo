import { Video, AlertCircle } from 'lucide-react';
import { useWebcam } from '../../hooks/useWebcam';

/**
 * Full-bleed live webcam preview with optional HUD overlays as children.
 */
export default function LiveCameraPreview({
  active = true,
  mirrored = true,
  className = '',
  videoClassName = '',
  showPlaceholder = true,
  children,
}) {
  const { videoRef, ready, error } = useWebcam({ active });

  return (
    <div className={`relative overflow-hidden bg-primary-container/20 ${className}`}>
      {active && !error && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            mirrored ? '-scale-x-100' : ''
          } ${videoClassName}`}
        />
      )}

      {active && !ready && !error && showPlaceholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant/80 z-[1]">
          <Video className="w-10 h-10 animate-pulse text-secondary/50" />
          <p className="label-caps text-[10px]">Starting camera…</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center z-[1] bg-primary-container/30">
          <AlertCircle className="w-10 h-10 text-error/70" />
          <p className="text-xs text-on-surface-variant max-w-xs">{error}</p>
          <p className="label-caps text-[9px] text-on-surface-variant/70">
            Allow camera access in browser settings
          </p>
        </div>
      )}

      {!active && showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center z-[1]">
          <p className="label-caps text-on-surface-variant">Camera off</p>
        </div>
      )}

      {children}
    </div>
  );
}
