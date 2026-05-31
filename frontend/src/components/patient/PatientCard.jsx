import { motion } from 'framer-motion';
import { Heart, MapPin, Mountain } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import GlassCard from '../ui/GlassCard';

export default function PatientCard({ patient, onClick, selected }) {
  return (
    <GlassCard
      onClick={onClick}
      hover
      className={`cursor-pointer ${selected ? 'ring-2 ring-secondary-container' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-mono text-xs text-secondary">{patient.id}</p>
          <h3 className="font-sora font-semibold text-lg text-primary">{patient.name}</h3>
          <p className="text-sm text-on-surface-variant">
            {patient.rank} · {patient.regiment}
          </p>
        </div>
        <StatusBadge status={patient.status} />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-error" />
          <span className="font-mono text-sm font-bold">{patient.heartRate}</span>
          <span className="text-xs text-on-surface-variant">BPM</span>
        </div>
        <div>
          <span className="font-mono text-sm font-bold text-secondary">{patient.spo2}%</span>
          <span className="text-xs text-on-surface-variant ml-1">SpO2</span>
        </div>
        <div>
          <span className="font-mono text-sm font-bold">{patient.temp}°C</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Mountain className="w-3 h-3" />
          {patient.altitude.toLocaleString()} ft
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {patient.location}
        </span>
      </div>
      <motion.div
        className="mt-2 h-1 bg-surface-container-highest rounded-full overflow-hidden"
        initial={false}
      >
        <motion.div
          className={`h-full ${patient.fatigue > 70 ? 'bg-error' : 'bg-secondary'}`}
          animate={{ width: `${patient.fatigue}%` }}
        />
      </motion.div>
      <p className="label-caps text-[10px] text-on-surface-variant mt-1">
        Fatigue Index: {patient.fatigue}%
      </p>
    </GlassCard>
  );
}
