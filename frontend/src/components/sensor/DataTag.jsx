const STYLES = {
  experimental: 'text-amber-700 border-amber-400/70 bg-amber-50',
  simulated: 'text-on-surface-variant border-outline-variant border-dashed bg-surface-container-low',
  resolved: 'text-success border-success/40 bg-success/5',
  sensor: 'text-secondary border-secondary/40 bg-secondary/5',
};

const TEXT = {
  experimental: 'Experimental',
  simulated: 'Simulated',
  resolved: 'Resolved',
  sensor: 'Sensor',
};

const TITLE = {
  experimental: 'Real sensor data, but a student prototype - not medically validated.',
  simulated: 'Dummy value - there is no real sensor for this yet.',
  resolved: 'This alert has ended.',
  sensor: 'Made by the sensor hub (experimental).',
};

/** Small label that says where a value comes from: EXPERIMENTAL (real sensor) or SIMULATED (dummy). */
export default function DataTag({ kind, className = '' }) {
  return (
    <span
      title={TITLE[kind]}
      className={`inline-flex items-center align-middle px-1.5 py-px rounded border text-[8px] font-semibold uppercase tracking-wider leading-tight ${STYLES[kind]} ${className}`}
    >
      {TEXT[kind]}
    </span>
  );
}
