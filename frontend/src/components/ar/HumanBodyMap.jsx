import { motion } from 'framer-motion';
import { organData } from '../../data/mockData';

const HUMAN_IMAGE = '/humanImg.jpg';

/**
 * Click regions as % of the image box (top-left origin).
 * Tuned for humanImg.jpg — front-facing, full-body portrait.
 */
/** Larger regions first; smaller/specific regions last for correct click stacking. */
const BODY_REGIONS = [
  { id: 'legs', label: 'Legs', top: 52, left: 34, width: 32, height: 38, color: '#002d62' },
  { id: 'chest', label: 'Chest', top: 22, left: 34, width: 32, height: 24, color: '#00dbe9' },
  { id: 'arms', label: 'Arms', top: 24, left: 18, width: 14, height: 34, color: '#006970', key: 'arms-left' },
  { id: 'arms', label: 'Arms', top: 24, left: 68, width: 14, height: 34, color: '#006970', key: 'arms-right' },
  { id: 'lungs', label: 'Lungs', top: 24, left: 32, width: 36, height: 14, color: '#5398eb' },
  { id: 'heart', label: 'Heart', top: 27, left: 52, width: 14, height: 12, color: '#ba1a1a' },
  { id: 'brain', label: 'Brain', top: 4, left: 38, width: 24, height: 14, color: '#00eefc' },
  { id: 'nose', label: 'Respiration', top: 10, left: 42, width: 16, height: 10, color: '#7df4ff' },
];

function RegionButton({ region, active, onSelect }) {
  const key = region.key ?? region.id;
  const data = organData[region.id];

  return (
    <button
      type="button"
      key={key}
      aria-label={`${region.label} — ${data?.label ?? region.id}`}
      title={region.label}
      onClick={() => onSelect(region.id)}
      className={`absolute rounded-lg border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
        active
          ? 'border-secondary bg-secondary/20 shadow-[0_0_20px_rgba(0,238,252,0.35)] z-10'
          : 'border-transparent bg-transparent hover:border-secondary/50 hover:bg-secondary/10'
      }`}
      style={{
        top: `${region.top}%`,
        left: `${region.left}%`,
        width: `${region.width}%`,
        height: `${region.height}%`,
      }}
    >
      {active && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <span
            className="label-caps text-[9px] whitespace-nowrap px-2 py-0.5 rounded-full bg-secondary-container text-primary shadow-sm"
          >
            {region.label}
          </span>
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full -z-10"
            style={{ backgroundColor: region.color, boxShadow: `0 0 12px ${region.color}` }}
          />
        </motion.span>
      )}
    </button>
  );
}

export default function HumanBodyMap({ onOrganClick, activeOrgan }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-gradient-to-b from-[#d4eaf7] to-white border border-secondary/10 flex items-center justify-center"
    >
      <div className="relative h-full max-h-full py-4">
        <img
          src={HUMAN_IMAGE}
          alt="Patient full-body scan for AR diagnostics"
          className="block h-full w-auto max-w-full object-contain select-none pointer-events-none"
          draggable={false}
        />

        {/* AR scan overlay */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-secondary/5 via-transparent to-primary/5 mix-blend-multiply"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 top-0 h-px bg-secondary/30 animate-pulse pointer-events-none"
          aria-hidden
        />

        <div className="absolute inset-0">
          {BODY_REGIONS.map((region) => (
            <RegionButton
              key={region.key ?? region.id}
              region={region}
              active={activeOrgan === region.id}
              onSelect={onOrganClick}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
