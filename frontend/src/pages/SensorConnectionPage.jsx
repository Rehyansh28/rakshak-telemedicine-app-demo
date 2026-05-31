import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Droplets, Thermometer, Shield, CheckCircle, Loader2 } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import { PATHS } from '../routes/paths';
import { sensorSteps } from '../data/mockData';
import { useApp } from '../context/AppContext';

const icons = { heart: Heart, droplets: Droplets, thermometer: Thermometer, shield: Shield };

export default function SensorConnectionPage() {
  const navigate = useNavigate();
  const { sensorProgress, setSensorProgress, showToast } = useApp();

  useEffect(() => {
    setSensorProgress(0);
    const interval = setInterval(() => {
      setSensorProgress((p) => (p >= 100 ? 100 : p + 5));
    }, 400);
    return () => clearInterval(interval);
  }, [setSensorProgress]);

  useEffect(() => {
    if (sensorProgress >= 100) {
      const t = setTimeout(() => {
        showToast('All sensors synced — proceed to camera', 'success');
        navigate(PATHS.patient.camera);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [sensorProgress, navigate, showToast]);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-caps text-secondary mb-2">Bio-Suit Initialization</p>
        <h1 className="font-sora text-2xl md:text-3xl font-bold text-primary mb-2">Sensor Connection Hub</h1>
        <p className="text-on-surface-variant text-sm mb-8">
          4-step tactical sequence for bio-suit sensor pairing and STRAT-LINK verification
        </p>
      </motion.div>

      <div className="mb-8">
        <div className="flex justify-between label-caps text-[10px] text-on-surface-variant mb-2">
          <span>Sync Progress</span>
          <span>{Math.min(sensorProgress, 100)}%</span>
        </div>
        <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div className="h-full bg-secondary" animate={{ width: `${Math.min(sensorProgress, 100)}%` }} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {sensorSteps.map((step, i) => {
          const Icon = icons[step.icon] || Heart;
          const isDone = sensorProgress > (i + 1) * 25;
          const isSyncing = step.status === 'syncing' && !isDone;
          return (
            <GlassCard key={step.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center">
                    <Icon className="w-6 h-6 text-secondary-container" />
                  </div>
                  <div>
                    <p className="label-caps text-[10px] text-on-surface-variant">Step {step.id}</p>
                    <h3 className="font-sora font-semibold text-primary">{step.label}</h3>
                  </div>
                </div>
                {isDone ? (
                  <CheckCircle className="w-6 h-6 text-[#16a34a]" />
                ) : isSyncing ? (
                  <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-outline-variant" />
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="relative overflow-hidden mb-8">
        <div className="scan-line pointer-events-none" />
        <div className="flex items-center gap-4">
          <Shield className="w-8 h-8 text-secondary" />
          <div>
            <p className="label-caps text-secondary">STRAT-LINK Encryption</p>
            <p className="text-sm text-on-surface-variant">AES-256 tunnel · SHA-256 handshake</p>
          </div>
          {sensorProgress >= 75 && (
            <span className="ml-auto label-caps text-[10px] text-[#16a34a] flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> VERIFIED
            </span>
          )}
        </div>
      </GlassCard>

      {sensorProgress >= 100 && (
        <Button onClick={() => navigate(PATHS.patient.camera)} className="w-full">
          Continue to Camera Alignment
        </Button>
      )}
    </div>
  );
}
