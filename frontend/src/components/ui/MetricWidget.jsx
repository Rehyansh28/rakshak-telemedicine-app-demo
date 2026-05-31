import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

export default function MetricWidget({
  label,
  value,
  unit,
  live = false,
  icon: Icon,
  progress,
  borderAccent,
}) {
  return (
    <GlassCard borderAccent={borderAccent}>
      <div className="flex justify-between items-center mb-2">
        <span className="label-caps text-on-surface-variant">{label}</span>
        {live && (
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-secondary font-mono text-sm font-bold"
          >
            LIVE
          </motion.span>
        )}
        {Icon && <Icon className="w-4 h-4 text-secondary" />}
      </div>
      <div className="flex items-end gap-2">
        <motion.span
          key={value}
          initial={{ scale: 1.1, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-sora text-4xl font-bold text-primary"
        >
          {value}
        </motion.span>
        {unit && (
          <span className="label-caps text-on-surface-variant mb-2">{unit}</span>
        )}
      </div>
      {progress !== undefined && (
        <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden mt-2">
          <motion.div
            className="h-full bg-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      )}
    </GlassCard>
  );
}
