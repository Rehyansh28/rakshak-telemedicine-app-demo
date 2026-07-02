import { useRef } from 'react';
import LocalVideo from './LocalVideo';
import RemoteVideo from './RemoteVideo';
import Controls from './Controls';
import CallTimer from './CallTimer';
import StatusBadge from '../ui/StatusBadge';

export default function VideoCall({
  localStream,
  remoteStream,
  call,
  connectionStatus,
  micMuted,
  videoOn,
  onToggleMic,
  onToggleVideo,
  onEndCall,
  label = 'Remote Patient Link',
}) {
  const containerRef = useRef(null);

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Failed to enter fullscreen mode', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Failed to exit fullscreen mode', err);
      });
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'new':
      case 'connecting':
      case 'checking':
        return 'CONNECTING UPLINK';
      case 'connected':
        return 'SECURE STRAT-LINK';
      case 'disconnected':
        return 'LINK INTERRUPTED';
      case 'failed':
        return 'UPLINK FAILED';
      case 'closed':
        return 'LINK TERMINATED';
      default:
        return connectionStatus.toUpperCase();
    }
  };

  const getStatusType = () => {
    if (connectionStatus === 'connected') return 'consultation';
    if (connectionStatus === 'disconnected' || connectionStatus === 'failed') return 'critical';
    return 'warning';
  };

  const isConnecting = connectionStatus === 'connecting' || connectionStatus === 'checking';
  const isDisconnected = connectionStatus === 'disconnected' || connectionStatus === 'failed';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[350px] aspect-video rounded-xl overflow-hidden bg-primary-container/10 border border-outline-variant/30 flex flex-col justify-between"
    >
      {/* Remote Video (Full-bleed background) */}
      <div className="absolute inset-0 z-0">
        <RemoteVideo
          stream={remoteStream}
          isConnecting={isConnecting}
          isDisconnected={isDisconnected}
          label={label}
        />
      </div>

      {/* Floating Header Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <StatusBadge status={getStatusType()} label={getStatusLabel()} />
            {micMuted && <StatusBadge status="monitoring" label="MIC MUTED" />}
            {!videoOn && <StatusBadge status="warning" label="VIDEO PAUSED" />}
          </div>
          <span className="label-caps text-[9px] text-error flex items-center gap-1 font-bold bg-black/45 px-2 py-0.5 rounded backdrop-blur-sm self-start">
            <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse" />
            REC · ENCRYPTED
          </span>
        </div>

        {/* Duration Timer */}
        <div className="pointer-events-auto bg-black/30 backdrop-blur-sm rounded-lg overflow-hidden">
          <CallTimer startTime={call?.acceptedAt || call?.requestedAt} />
        </div>
      </div>

      {/* Local Video Overlay (floating box, picture-in-picture) */}
      <div className="absolute bottom-20 right-4 z-20 w-40 sm:w-48 shadow-2xl transition-all hover:scale-[1.02]">
        <LocalVideo stream={localStream} videoOn={videoOn} />
      </div>

      {/* Floating Toolbar Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full px-4 flex justify-center">
        <div className="bg-black/35 backdrop-blur-md px-5 py-3 rounded-full border border-outline-variant/20 shadow-xl">
          <Controls
            micMuted={micMuted}
            videoOn={videoOn}
            onToggleMic={onToggleMic}
            onToggleVideo={onToggleVideo}
            onEndCall={onEndCall}
            onToggleFullscreen={handleToggleFullscreen}
          />
        </div>
      </div>
    </div>
  );
}
