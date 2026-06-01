import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { generateEcgPoints, ecgArrayToChartPoints } from '../../utils/ecg';
import { apiGet } from '../../api/client';

export default function MiniECG({ height = 40, animated = true, patientId, ecgPoints: ecgPointsProp }) {
  const [ecgBaseline, setEcgBaseline] = useState(null);

  useEffect(() => {
    if (ecgPointsProp) return;
    if (!patientId) return;
    apiGet(`/patients/${patientId}/organs/`)
      .then((organs) => {
        if (organs.heart?.ecgPoints) setEcgBaseline(organs.heart.ecgPoints);
      })
      .catch(() => {});
  }, [patientId, ecgPointsProp]);

  const data = useMemo(() => {
    const source = ecgPointsProp || ecgBaseline;
    const fromApi = ecgArrayToChartPoints(source);
    if (fromApi) return fromApi;
    return generateEcgPoints(50);
  }, [ecgBaseline, ecgPointsProp]);

  return (
    <div className="vitals-wave rounded" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={[0, 100]} hide />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#00dbe9"
            strokeWidth={2}
            dot={false}
            isAnimationActive={animated}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
