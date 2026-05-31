import { useState, useEffect } from 'react';

export function useLiveVitals(initial) {
  const [vitals, setVitals] = useState(initial);

  useEffect(() => {
    const id = setInterval(() => {
      setVitals((prev) => ({
        ...prev,
        heartRate: prev.heartRate + (Math.random() > 0.5 ? 1 : -1),
        spo2: Math.max(85, Math.min(100, prev.spo2 + (Math.random() > 0.6 ? -1 : 0))),
      }));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return vitals;
}
