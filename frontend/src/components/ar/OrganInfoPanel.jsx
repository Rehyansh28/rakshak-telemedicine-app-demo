import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Wind, Brain, Heart, ExternalLink } from 'lucide-react';
import { PATHS } from '../../routes/paths';
import { useApp } from '../../context/useApp';
import { apiGet } from '../../api/client';
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
  const { selectedPatient } = useApp();
  const [organData, setOrganData] = useState({});

  useEffect(() => {
    if (!selectedPatient?.id) return;
    apiGet(`/patients/${selectedPatient.id}/organs/`).then(setOrganData).catch(() => {});
  }, [selectedPatient?.id]);

  const data = organId ? organData[organId] : null;
  const Icon = icons[organId] || Activity;

  const openFull = () => {
    if (organId) {
      navigate(PATHS.doctor.organ(organId));
      onClose?.();
    }
  };

  if (!organId || !data) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="fixed right-4 top-20 bottom-4 w-80 z-40 flex flex-col"
      >
        <GlassCard className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-secondary" />
              <h3 className="font-sora font-semibold text-primary">{data.label}</h3>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-on-surface-variant hover:text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>

          {organId === 'heart' && (
            <div className="mb-4">
              <MiniECG height={60} patientId={selectedPatient?.id} ecgPoints={data.ecgPoints} />
            </div>
          )}

          <div className="space-y-2 text-sm mb-6">
            {Object.entries(data)
              .filter(([k]) => !['label', 'ecgPoints'].includes(k))
              .map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-outline-variant/20 capitalize">
                  <span className="text-on-surface-variant">{k}</span>
                  <span className="font-mono font-bold">{String(v)}</span>
                </div>
              ))}
          </div>

          <Button variant="secondary" className="w-full" icon={ExternalLink} onClick={openFull}>
            Full Diagnostic
          </Button>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
}
