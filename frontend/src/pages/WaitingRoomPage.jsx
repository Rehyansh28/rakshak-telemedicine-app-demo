import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, Shield, Heart } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import MiniECG from '../components/charts/MiniECG';
import Button from '../components/ui/Button';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/AppContext';

export default function WaitingRoomPage() {
  const navigate = useNavigate();
  const { vitals, showToast, setIsAuthenticated, setRole } = useApp();
  const queuePosition = 2;
  const waitTime = 4;

  const simulateDoctorJoined = () => {
    showToast('Medical officer connected — uplink established', 'success');
    setRole('doctor');
    setIsAuthenticated(true);
    setTimeout(() => navigate(PATHS.doctor.consultation), 800);
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 rounded-full bg-secondary-container/20 border-2 border-secondary-container flex items-center justify-center mx-auto mb-6"
        >
          <Users className="w-10 h-10 text-secondary" />
        </motion.div>
        <h1 className="font-sora text-2xl md:text-3xl font-bold text-primary mb-2">Patient Waiting Room</h1>
        <p className="text-on-surface-variant text-sm">Medical officer will join shortly via secure uplink</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <GlassCard className="text-center">
          <Clock className="w-8 h-8 text-secondary mx-auto mb-3" />
          <p className="label-caps text-on-surface-variant text-[10px]">Queue Position</p>
          <p className="font-sora text-4xl font-bold text-primary">#{queuePosition}</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="label-caps text-on-surface-variant text-[10px]">Est. Wait Time</p>
          <p className="font-sora text-4xl font-bold text-primary">~{waitTime}</p>
          <p className="label-caps text-[10px] text-on-surface-variant">minutes</p>
        </GlassCard>
      </div>

      <GlassCard className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-error" />
          <span className="label-caps text-on-surface-variant text-[10px]">Your Live Vitals</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4 text-center">
          <div>
            <p className="text-2xl font-bold font-mono">{vitals.heartRate}</p>
            <p className="text-xs text-on-surface-variant">BPM</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-secondary">{vitals.spo2}%</p>
            <p className="text-xs text-on-surface-variant">SpO2</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono">{vitals.temp}°</p>
            <p className="text-xs text-on-surface-variant">Temp</p>
          </div>
        </div>
        <MiniECG height={50} />
      </GlassCard>

      <GlassCard className="mb-8">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-secondary shrink-0" />
          <p className="text-sm text-on-surface-variant">
            All biometric data encrypted via STRAT-LINK. Do not disconnect bio-suit.
          </p>
        </div>
      </GlassCard>

      <Button onClick={simulateDoctorJoined} className="w-full mb-4">
        Simulate Doctor Joined (Demo)
      </Button>

      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-center label-caps text-secondary text-[10px]"
      >
        Awaiting medical officer assignment...
      </motion.p>
    </div>
  );
}
