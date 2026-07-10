import React, { useEffect, useRef, useState } from 'react';
import { MediaPipeProcessor } from './MediaPipeProcessor';
import { mapLandmarksToCoordinates } from './CoordinateMapper';
import { getOrganCoordinates } from './OrganProjection';
import { drawPose } from './PoseRenderer';
import { OrganOverlay } from './OrganOverlay';
import { AlertCircle, ToggleLeft, ToggleRight, Play } from 'lucide-react';

const organs = ['brain', 'heart', 'left_lung', 'right_lung', 'liver', 'stomach'];
const bodyParts = ['head', 'chest', 'left_arm', 'right_arm', 'left_leg', 'right_leg'];

// Helper to transform bounding boxes from raw source coordinates to displayed coordinates
const transformCoordinates = (coords, videoElement) => {
  if (!videoElement || !coords) return {};
  
  const rect = videoElement.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;
  const sourceWidth = videoElement.videoWidth || 640;
  const sourceHeight = videoElement.videoHeight || 480;

  if (sourceWidth === 0 || sourceHeight === 0 || displayWidth === 0 || displayHeight === 0) {
    return coords;
  }

  const sourceAspectRatio = sourceWidth / sourceHeight;
  const displayAspectRatio = displayWidth / displayHeight;

  let visibleWidth = displayWidth;
  let visibleHeight = displayHeight;
  let offsetX = 0;
  let offsetY = 0;

  // Retrieve computed style to determine ifcontain or cover is active
  const style = window.getComputedStyle(videoElement);
  const objectFit = style.objectFit || 'contain';

  if (objectFit === 'cover') {
    if (sourceAspectRatio > displayAspectRatio) {
      visibleHeight = displayHeight;
      visibleWidth = displayHeight * sourceAspectRatio;
      offsetX = (displayWidth - visibleWidth) / 2;
      offsetY = 0;
    } else {
      visibleWidth = displayWidth;
      visibleHeight = displayWidth / sourceAspectRatio;
      offsetX = 0;
      offsetY = (displayHeight - visibleHeight) / 2;
    }
  } else { // default to 'contain'
    if (sourceAspectRatio > displayAspectRatio) {
      visibleWidth = displayWidth;
      visibleHeight = displayWidth / sourceAspectRatio;
      offsetX = 0;
      offsetY = (displayHeight - visibleHeight) / 2;
    } else {
      visibleHeight = displayHeight;
      visibleWidth = displayHeight * sourceAspectRatio;
      offsetX = (displayWidth - visibleWidth) / 2;
      offsetY = 0;
    }
  }

  const scaleX = visibleWidth / sourceWidth;
  const scaleY = visibleHeight / sourceHeight;

  const newCoords = {};
  for (const [key, bbox] of Object.entries(coords)) {
    if (bbox) {
      const [x1, y1, x2, y2] = bbox;
      const tx1 = Math.round(offsetX + x1 * scaleX);
      const ty1 = Math.round(offsetY + y1 * scaleY);
      const tx2 = Math.round(offsetX + x2 * scaleX);
      const ty2 = Math.round(offsetY + y2 * scaleY);
      newCoords[key] = [tx1, ty1, tx2, ty2];
    }
  }
  return newCoords;
};

export default function LiveARCanvas({ remoteStream, onOrganClick, activeOrgan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processorRef = useRef(null);
  const organOverlayRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  const [isPoseDetected, setIsPoseDetected] = useState(false);
  const [organProjectionEnabled, setOrganProjectionEnabled] = useState(false);
  const [hoveredPart, setHoveredPartState] = useState(null);
  const [coordinates, setCoordinates] = useState({});

  const hoveredPartRef = useRef(null);
  const latestCoordsRef = useRef({});
  const lastFrameTimeRef = useRef(0);

  const setHoveredPart = (part) => {
    if (hoveredPartRef.current !== part) {
      hoveredPartRef.current = part;
      setHoveredPartState(part);
    }
  };

  // Initialize MediaPipe and preload organ textures
  useEffect(() => {
    organOverlayRef.current = new OrganOverlay();
    organOverlayRef.current.preload().then(() => {
      console.log('Organ overlay assets loaded.');
    });

    const onPoseResults = (results) => {
      if (!canvasRef.current || !videoRef.current) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!results.poseLandmarks) {
        setIsPoseDetected(false);
        latestCoordsRef.current = {};
        setCoordinates({});
        return;
      }

      setIsPoseDetected(true);
      
      // 1. Map landmarks to raw coordinate bounds of video source resolution
      const sourceWidth = video.videoWidth || 640;
      const sourceHeight = video.videoHeight || 480;
      const rawCoords = mapLandmarksToCoordinates(
        results.poseLandmarks,
        sourceWidth,
        sourceHeight
      );

      // 2. Scale raw source coordinates to displayed size
      const displayCoords = transformCoordinates(rawCoords, video);

      latestCoordsRef.current = displayCoords;
      setCoordinates(displayCoords);

      // 3. Draw onto overlay canvas matching displayed dimensions
      if (organProjectionEnabled) {
        organOverlayRef.current.renderCanvas(
          ctx,
          displayCoords,
          canvas.width,
          canvas.height,
          activeOrgan
        );
      } else {
        drawPose(ctx, displayCoords, hoveredPartRef.current);
      }
    };

    processorRef.current = new MediaPipeProcessor(onPoseResults);

    return () => {
      if (processorRef.current) {
        processorRef.current.close();
      }
    };
  }, [organProjectionEnabled, activeOrgan]);

  // High performance Frame-processing loop (Target 20-30 FPS)
  useEffect(() => {
    let active = true;
    const FPS_LIMIT = 25;
    const FRAME_INTERVAL = 1000 / FPS_LIMIT;

    const processFrame = async (timestamp) => {
      if (!active) return;

      if (videoRef.current && isPlaying && processorRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Synchronize drawing coordinates size to displayed video bounds
        if (canvas) {
          const rect = video.getBoundingClientRect();
          if (canvas.width !== rect.width || canvas.height !== rect.height) {
            canvas.width = rect.width;
            canvas.height = rect.height;
          }
        }

        if (timestamp - lastFrameTimeRef.current >= FRAME_INTERVAL) {
          lastFrameTimeRef.current = timestamp;
          await processorRef.current.send(video);
        }
      }

      requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);

    return () => {
      active = false;
    };
  }, [isPlaying]);

  // Bind WebRTC stream
  useEffect(() => {
    if (remoteStream && videoRef.current) {
      console.log('Attaching live WebRTC stream to AR processor.');
      videoRef.current.srcObject = remoteStream;
      setIsSimulation(false);
      
      // Ensure element settings allow direct playback
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Failed to auto-play WebRTC remote stream:', err);
      });
    }
  }, [remoteStream]);

  // Simulator Fallback
  const handleStartSimulation = () => {
    setIsSimulation(true);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = 'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-in-the-gym-44167-large.mp4';
      videoRef.current.loop = true;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Failed to run simulation video:', err);
      });
    }
  };

  // Hover detection mapping
  const handleMouseMove = (e) => {
    if (!canvasRef.current || !latestCoordsRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const activeSet = organProjectionEnabled ? organs : bodyParts;
    const activeCoords = organProjectionEnabled 
      ? getOrganCoordinates(latestCoordsRef.current) 
      : latestCoordsRef.current;

    let hovered = null;
    for (const part of activeSet) {
      const bbox = activeCoords[part];
      if (bbox) {
        const [x1, y1, x2, y2] = bbox;
        if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
          hovered = part;
          break;
        }
      }
    }
    setHoveredPart(hovered);
  };

  const handleMouseLeave = () => {
    setHoveredPart(null);
  };

  // Raycast click detection on viewport canvas
  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !latestCoordsRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const activeSet = organProjectionEnabled ? organs : bodyParts;
    const activeCoords = organProjectionEnabled 
      ? getOrganCoordinates(latestCoordsRef.current) 
      : latestCoordsRef.current;

    let clickedPart = null;
    for (const part of activeSet) {
      const bbox = activeCoords[part];
      if (bbox) {
        const [x1, y1, x2, y2] = bbox;
        if (clickX >= x1 && clickX <= x2 && clickY >= y1 && clickY <= y2) {
          clickedPart = part;
          break;
        }
      }
    }

    if (clickedPart) {
      const mappedOrgan = mapToRakshakOrgan(clickedPart);
      onOrganClick(mappedOrgan);
    }
  };

  const mapToRakshakOrgan = (partId) => {
    switch (partId) {
      case 'left_lung':
      case 'right_lung':
        return 'lungs';
      case 'left_arm':
      case 'right_arm':
        return 'arms';
      case 'left_leg':
      case 'right_leg':
        return 'legs';
      case 'head':
        return 'brain';
      default:
        return partId; // heart, brain, liver, stomach, chest
    }
  };

  const toggleOrganProjection = () => {
    const nextVal = !organProjectionEnabled;
    setOrganProjectionEnabled(nextVal);
    if (organOverlayRef.current) {
      organOverlayRef.current.startFade();
    }
  };

  const activeSet = organProjectionEnabled ? organs : bodyParts;
  const activeCoords = organProjectionEnabled 
    ? getOrganCoordinates(coordinates) 
    : coordinates;

  const totalMapped = Object.keys(activeCoords).length;

  return (
    <div className="flex flex-col xl:flex-row gap-4 w-full h-full min-h-0">
      {/* Viewport Frame */}
      <div className="flex-1 relative min-h-[400px] rounded-xl overflow-hidden bg-primary-container/10 border border-outline-variant/30 flex items-center justify-center">
        {/* Remote incoming stream */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          autoPlay
          crossOrigin="anonymous"
        />

        {/* Canvas overlays */}
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
          className="absolute inset-0 w-full h-full cursor-crosshair z-10"
        />

        {/* Continuous scanner animations */}
        {isPoseDetected && <div className="scan-line z-0 pointer-events-none" />}

        {/* Pose lost fallback handler overlay */}
        {(!isPlaying || !isPoseDetected) && (
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-20 pointer-events-none">
            <div className="glass-panel p-6 rounded-2xl border border-secondary/20 flex flex-col items-center gap-3 max-w-sm shadow-2xl pointer-events-auto">
              <AlertCircle className="w-10 h-10 text-secondary animate-pulse" />
              <h3 className="font-sora text-sm font-semibold text-primary">
                Waiting for patient positioning...
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {!isPlaying 
                  ? 'Uplink tactical stream is currently offline. Establish WebRTC connection or run simulator demo feed.'
                  : 'Please position the patient fully in the frame to begin body-part localization diagnostics.'}
              </p>
              {!isPlaying && (
                <button
                  onClick={handleStartSimulation}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-secondary text-white rounded-lg text-xs font-semibold hover:bg-secondary/90 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Launch Simulation Demo
                </button>
              )}
            </div>
          </div>
        )}

        {/* HUD Overlay Labels */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-1.5">
          <span className="label-caps text-[8px] px-2 py-0.5 bg-black/50 text-secondary-fixed-dim rounded backdrop-blur-md self-start flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isPoseDetected ? 'bg-success' : 'bg-error'} animate-pulse`} />
            {isPoseDetected ? 'TRACKING ACTIVE' : 'NO POSE DETECTED'}
          </span>
          <span className="label-caps text-[8px] px-2 py-0.5 bg-black/50 text-white rounded backdrop-blur-md self-start">
            SOURCE: {isSimulation ? 'SIMULATOR_FEED' : 'WEBRTC_UPLINK'}
          </span>
        </div>

        {/* projection toggles overlay */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={toggleOrganProjection}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/50 text-white rounded-lg text-[10px] font-mono font-bold tracking-wider hover:bg-black/70 backdrop-blur-md transition-all border border-white/10 cursor-pointer"
          >
            {organProjectionEnabled ? (
              <>
                <ToggleRight className="w-4 h-4 text-secondary-fixed-dim" />
                ORGAN PROJECTION: ON
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-on-surface-variant" />
                ORGAN PROJECTION: OFF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Diagnostics Coordinates table */}
      <div className="w-full xl:w-80 shrink-0 flex flex-col gap-3">
        <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
            <h4 className="label-caps text-secondary text-[10px]">Diagnostics HUD</h4>
            <span className="text-[10px] font-mono text-on-surface-variant bg-surface px-2 py-0.5 rounded">
              Mapped: {totalMapped}/6
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[10px] font-mono">
              <thead>
                <tr className="text-on-surface-variant border-b border-outline-variant/10">
                  <th className="py-1.5 font-bold">Region/Organ</th>
                  <th className="py-1.5 font-bold text-right">Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {activeSet.map(item => {
                  const isDetected = activeCoords[item] !== undefined;
                  const boxVal = isDetected ? `[${activeCoords[item].join(',')}]` : 'N/A';
                  const isHovered = item === hoveredPart;
                  const isSelected = item === activeOrgan || 
                    (item === 'left_lung' && activeOrgan === 'lungs') || 
                    (item === 'right_lung' && activeOrgan === 'lungs') || 
                    (item === 'left_arm' && activeOrgan === 'arms') || 
                    (item === 'right_arm' && activeOrgan === 'arms') || 
                    (item === 'left_leg' && activeOrgan === 'legs') || 
                    (item === 'right_leg' && activeOrgan === 'legs');

                  return (
                    <tr
                      key={item}
                      className={`border-b border-outline-variant/5 transition-colors cursor-pointer ${
                        isSelected ? 'bg-secondary/10 text-primary font-bold' : isHovered ? 'bg-secondary/5' : 'hover:bg-outline-variant/5'
                      }`}
                      onClick={() => {
                        if (isDetected) {
                          onOrganClick(mapToRakshakOrgan(item));
                        }
                      }}
                    >
                      <td className="py-1.5 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isDetected ? 'bg-secondary-fixed-dim' : 'bg-outline-variant'}`} />
                        <span className="capitalize">{item.replace('_', ' ')}</span>
                      </td>
                      <td className={`py-1.5 text-right font-mono ${isDetected ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {boxVal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
