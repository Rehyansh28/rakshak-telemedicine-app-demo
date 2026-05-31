import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { generateEcgPoints } from '../../data/mockData';

export default function MiniECG({ height = 40, animated = true }) {
  const data = useMemo(() => generateEcgPoints(50), []);

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
