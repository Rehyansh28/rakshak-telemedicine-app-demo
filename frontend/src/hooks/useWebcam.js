import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Binds a live camera stream to a video element.
 * @param {{ active?: boolean, facingMode?: 'user' | 'environment' }} options
 */
export function useWebcam({ active = true, facingMode = 'user' } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setReady(false);
  }, []);

  useEffect(() => {
    if (!active) {
      stopStream();
      setError(null);
      return undefined;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported in this browser');
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setReady(true);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Could not access camera');
          setReady(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [active, facingMode, stopStream]);

  return { videoRef, ready, error };
}
