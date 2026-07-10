import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2 } from 'lucide-react';

export default function Controls({
  micMuted,
  videoOn,
  onToggleMic,
  onToggleVideo,
  onEndCall,
  onToggleFullscreen,
}) {
  return (
    <div className="flex justify-center gap-3">
      {/* Microphone toggle */}
      <button
        type="button"
        onClick={onToggleMic}
        title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          micMuted
            ? 'glass-panel text-on-surface-variant hover:text-primary'
            : 'glass-panel text-primary ring-2 ring-secondary/40'
        }`}
      >
        {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Video toggle */}
      <button
        type="button"
        onClick={onToggleVideo}
        title={videoOn ? 'Turn Video Off' : 'Turn Video On'}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          !videoOn
            ? 'glass-panel text-on-surface-variant hover:text-primary'
            : 'glass-panel text-primary ring-2 ring-secondary/40'
        }`}
      >
        {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </button>

      {/* End Call Button */}
      <button
        type="button"
        onClick={onEndCall}
        title="End Call"
        className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-error hover:bg-error/90 text-white shadow-lg"
      >
        <PhoneOff className="w-5 h-5" />
      </button>

      {/* Fullscreen button */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        title="Toggle Fullscreen"
        className="w-12 h-12 rounded-full flex items-center justify-center transition-colors glass-panel text-on-surface-variant hover:text-primary"
      >
        <Maximize2 className="w-5 h-5" />
      </button>
    </div>
  );
}
