import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../api/client';
import { hubStream } from '../services/hubStream';
import { describeSensor } from '../services/sensorStatus';

const INITIAL = { soldierId: null, linked: false, device: null, hr: null, agoS: null, status: 'none' };

/**
 * Live sensor status for one soldier (EXPERIMENTAL). Re-renders about once per second.
 * Also asks Django whether this soldier ever had sensor data, so "hub offline" can be
 * shown for a sensor soldier even when the hub is not running.
 */
export function useSensorLive(soldierId) {
  const [info, setInfo] = useState(INITIAL);
  const backendRef = useRef(null);

  useEffect(() => {
    const release = hubStream.use();
    const update = () => setInfo(describeSensor(soldierId, backendRef.current));
    const unsubscribe = hubStream.subscribe(update);
    const timer = setInterval(update, 1000);
    const first = setTimeout(update, 0);
    let cancelled = false;
    backendRef.current = null;
    if (soldierId) {
      apiGet(`/patients/${soldierId}/sensor/`)
        .then((data) => {
          if (cancelled) return;
          backendRef.current = data;
          update();
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
      unsubscribe();
      release();
    };
  }, [soldierId]);

  return info.soldierId === soldierId ? info : { ...INITIAL, soldierId };
}
