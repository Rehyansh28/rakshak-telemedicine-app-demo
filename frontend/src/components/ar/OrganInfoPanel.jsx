import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Wind, Brain, Heart, ExternalLink } from 'lucide-react';
import { organData } from '../../data/mockData';
import { PATHS } from '../../routes/paths';
import MiniECG from '../charts/MiniECG';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';

const icons = {
  heart: Heart,
  lungs: Wind,
  brain: Brain,
  chest: Activity,
  arms: Activity,
  legs: Activity,
  nose: Wind,
};

export default function OrganInfoPanel({ organId, onClose }) {
  const navigate = useNavigate();
  const data = organData[organId];
  const Icon = icons[organId] || Activity;

  const openFull = () => {
    if (organId) {
      navigate(PATHS.doctor.organ(organId));
      onClose?.();
    }
  };

  return (
    <AnimatePresence>
      {organId && data && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="fixed right-0 top-16 bottom-0 w-full md:w-96 z-50 p-4 bg-surface/95 backdrop-blur-xl border-l border-outline-variant/30 overflow-y-auto shadow-2xl"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-secondary" />
              <h3 className="font-sora font-semibold text-xl text-primary">{data.label}</h3>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-surface-container rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {organId === 'heart' && (
            <>
              <GlassCard className="mb-4">
                <p className="label-caps text-on-surface-variant mb-2">Live ECG</p>
                <MiniECG height={80} />
                <div className="flex justify-between mt-3">
                  <div>
                    <span className="font-sora text-3xl font-bold text-primary">{data.bpm}</span>
                    <span className="label-caps text-on-surface-variant ml-2">BPM</span>
                  </div>
                  <span className="label-caps text-secondary">{data.rhythm}</span>
                </div>
              </GlassCard>
              <GlassCard className="mb-4">
                <p className="label-caps text-on-surface-variant mb-2">Stetho-Sync</p>
                <p className="font-mono text-sm">{data.sound}</p>
              </GlassCard>
            </>
          )}

          {organId === 'chest' && (
            <GlassCard className="mb-4">
              <p className="label-caps text-on-surface-variant">Oxygen Level</p>
              <span className="font-sora text-4xl font-bold text-primary">{data.o2}%</span>
            </GlassCard>
          )}

          {organId === 'nose' && (
            <GlassCard className="mb-4">
              <p className="label-caps text-on-surface-variant">Respiration Rate</p>
              <span className="font-sora text-4xl font-bold text-primary">{data.rate}</span>
              <span className="label-caps text-on-surface-variant ml-2">BRPM</span>
            </GlassCard>
          )}

          {organId === 'arms' && (
            <GlassCard className="mb-4">
              <p className="label-caps text-on-surface-variant">Blood Pressure</p>
              <span className="font-sora text-3xl font-bold text-primary">
                {data.systolic}/{data.diastolic}
              </span>
              <span className="label-caps text-on-surface-variant ml-2">mmHg</span>
            </GlassCard>
          )}

          {organId === 'brain' && (
            <GlassCard className="mb-4">
              <p className="label-caps text-on-surface-variant">Stress Analysis</p>
              <span className="font-sora text-4xl font-bold text-primary">{data.score}</span>
            </GlassCard>
          )}

          {(organId === 'lungs' || organId === 'legs') && (
            <GlassCard className="mb-4">
              {Object.entries(data)
                .filter(([k]) => k !== 'label')
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-outline-variant/20 last:border-0 capitalize">
                    <span className="label-caps text-on-surface-variant">{k}</span>
                    <span className="font-mono text-sm font-bold">{String(v)}</span>
                  </div>
                ))}
            </GlassCard>
          )}

          <p className="label-caps text-error mb-4">Risk: {data.risk}</p>

          <Button variant="primary" icon={ExternalLink} onClick={openFull} className="w-full">
            Open Full Diagnostic
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
