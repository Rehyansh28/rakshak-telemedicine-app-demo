import { sensorBadge } from '../../services/sensorStatus';

const TONES = {
  good: 'bg-success/10 text-success border border-success/30',
  warn: 'bg-amber-500 text-white',
  bad: 'bg-error text-white',
  idle: 'bg-surface-container-highest text-on-surface-variant',
  replay: 'bg-violet-600 text-white',
};

/**
 * Status of a soldier's live sensor: live / disconnected / electrodes off / signal poor / data old,
 * or "Sensor hub not connected" where there is no hub (e.g. the website). Nothing for a soldier
 * without a sensor.
 */
export default function SensorStatusBadge({ info, className = '' }) {
  const badge = sensorBadge(info);
  if (!badge) return null;
  return (
    <span
      title={badge.title}
      className={`label-caps inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] ${TONES[badge.tone]} ${className}`}
    >
      {badge.tone === 'good' && <span className="w-2 h-2 rounded-full bg-success animate-pulse" />}
      {badge.label}
    </span>
  );
}
