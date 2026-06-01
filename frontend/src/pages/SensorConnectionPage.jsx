import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  Droplets,
  Thermometer,
  Shield,
  CheckCircle,
  Loader2,
  RefreshCw,
  Wifi,
  Battery,
  Signal,
  AlertCircle,
  ArrowRight,
  Radio,
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import PatientPageHeader from '../components/layout/PatientPageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/useApp';

const icons = { heart: Heart, droplets: Droplets, thermometer: Thermometer, shield: Shield };

function getStepState(index, progress) {
  const threshold = (index + 1) * 25;
  if (progress >= threshold) return 'done';
  if (progress >= threshold - 25) return 'active';
  return 'pending';
}

export default function SensorConnectionPage() {
  const navigate = useNavigate();
  const { sensorProgress, setSensorProgress, showToast, selectedPatient, vitals } = useApp();
  const [syncing, setSyncing] = useState(true);
  const [sensorSteps, setSensorSteps] = useState([]);

  useEffect(() => {
    if (!selectedPatient?.id) return;
    apiGet(`/patients/${selectedPatient.id}/sensor-steps/`).then(setSensorSteps).catch(() => {});
  }, [selectedPatient?.id]);

  const progress = Math.min(sensorProgress, 100);

  useEffect(() => {
    const interval = setInterval(() => {
      setSensorProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setSyncing(false);
          return 100;
        }
        return p + 5;
      });
    }, 450);
    return () => clearInterval(interval);
  }, [setSensorProgress]);

  const handleRetry = () => {
    setSensorProgress(0);
    setSyncing(true);
    showToast('Re-syncing all sensors...', 'info');
    const interval = setInterval(() => {
      setSensorProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setSyncing(false);
          return 100;
        }
        return p + 5;
      });
    }, 450);
  };

  return (
    <div>
      <PatientPageHeader
        eyebrow="Bio-Suit Initialization · Step 1 of 3"
        title="Sensor Connection Hub"
        description="Pair ECG, SpO2, temperature probes and verify STRAT-LINK encryption before camera alignment."
        actions={
          syncing ? (
            <StatusBadge status="syncing" label="SYNCING" />
          ) : (
            <StatusBadge status="connected" label="READY" />
          )
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress overview */}
          <GlassCard className="bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="label-caps text-on-surface-variant text-[10px]">Overall Sync Progress</p>
                <p className="font-sora text-4xl font-bold text-primary mt-1">{progress}%</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={RefreshCw} onClick={handleRetry} disabled={syncing}>
                  Retry Sync
                </Button>
                {progress >= 100 && (
                  <Button size="sm" icon={ArrowRight} onClick={() => navigate(PATHS.patient.camera)}>
                    Continue
                  </Button>
                )}
              </div>
            </div>
            <div className="h-3 bg-surface-container-highest rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-secondary to-secondary-container"
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-on-surface-variant mt-3">
              {syncing
                ? 'Establishing secure biometric tunnel...'
                : 'All sensors paired. Proceed to camera alignment.'}
            </p>
          </GlassCard>

          {/* Sensor steps — vertical timeline */}
          <div className="space-y-3">
            <p className="label-caps text-on-surface-variant text-[10px] px-1">Sensor Pairing Sequence</p>
            {sensorSteps.map((step, i) => {
              const Icon = icons[step.icon] || Heart;
              const state = getStepState(i, progress);
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <GlassCard
                    className={`bg-white ${
                      state === 'active' ? 'ring-2 ring-secondary/40 border-l-4 border-l-secondary' : ''
                    } ${state === 'done' ? 'border-l-4 border-l-[#16a34a]' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          state === 'done'
                            ? 'bg-[#16a34a]/10'
                            : state === 'active'
                              ? 'bg-secondary-container/20'
                              : 'bg-surface-container-low'
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            state === 'done'
                              ? 'text-[#16a34a]'
                              : state === 'active'
                                ? 'text-secondary'
                                : 'text-on-surface-variant'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="label-caps text-[10px] text-on-surface-variant">Step {step.id} of 4</p>
                        <h3 className="font-sora font-semibold text-primary">{step.label}</h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {state === 'done' && 'Connected · Signal stable'}
                          {state === 'active' && 'Pairing in progress...'}
                          {state === 'pending' && 'Awaiting previous step'}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {state === 'done' && <CheckCircle className="w-7 h-7 text-[#16a34a]" />}
                        {state === 'active' && <Loader2 className="w-7 h-7 text-secondary animate-spin" />}
                        {state === 'pending' && (
                          <div className="w-7 h-7 rounded-full border-2 border-outline-variant/50" />
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {progress >= 100 && (
            <Button onClick={() => navigate(PATHS.patient.camera)} className="w-full" icon={ArrowRight}>
              Continue to Camera Alignment
            </Button>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Soldier card */}
          <GlassCard className="bg-white">
            <p className="label-caps text-on-surface-variant text-[10px] mb-3">Active Soldier</p>
            <p className="font-sora font-bold text-primary">{selectedPatient.name}</p>
            <p className="font-mono text-xs text-secondary mt-1">{selectedPatient.id}</p>
            <p className="text-xs text-on-surface-variant mt-1">
              {selectedPatient.rank} · {selectedPatient.regiment}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-outline-variant/20 text-center">
              <div>
                <p className="font-mono text-lg font-bold text-error">{vitals.heartRate}</p>
                <p className="text-[10px] text-on-surface-variant">BPM</p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-secondary">{vitals.spo2}%</p>
                <p className="text-[10px] text-on-surface-variant">SpO2</p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold">{vitals.temp}°</p>
                <p className="text-[10px] text-on-surface-variant">Temp</p>
              </div>
            </div>
          </GlassCard>

          {/* Connection status */}
          <GlassCard className="bg-white space-y-3">
            <p className="label-caps text-on-surface-variant text-[10px]">Uplink Status</p>
            {[
              { icon: Wifi, label: 'STRAT-LINK', value: progress >= 75 ? 'Connected' : 'Handshaking', ok: progress >= 75 },
              { icon: Signal, label: 'SAT-NODE', value: 'Strong', ok: true },
              { icon: Radio, label: 'Latency', value: '42 ms', ok: true },
              { icon: Battery, label: 'Bio-Suit Power', value: '87%', ok: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-on-surface-variant">
                  <row.icon className="w-4 h-4" />
                  {row.label}
                </span>
                <span className={`font-mono text-xs font-bold ${row.ok ? 'text-[#16a34a]' : 'text-secondary'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </GlassCard>

          {/* Encryption */}
          <GlassCard className="bg-white relative overflow-hidden">
            {progress < 75 && <div className="scan-line pointer-events-none opacity-40" />}
            <div className="flex items-start gap-3">
              <Shield className="w-8 h-8 text-secondary shrink-0" />
              <div className="flex-1">
                <p className="label-caps text-secondary text-[10px]">STRAT-LINK Encryption</p>
                <p className="text-xs text-on-surface-variant mt-1">AES-256 tunnel · SHA-256 handshake</p>
                {progress >= 75 && (
                  <span className="inline-flex items-center gap-1 mt-2 label-caps text-[10px] text-[#16a34a]">
                    <CheckCircle className="w-3.5 h-3.5" /> VERIFIED
                  </span>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Help */}
          <GlassCard className="bg-white">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-primary">Troubleshooting</p>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Ensure bio-suit sensors are clean and firmly attached. Stay within SAT-NODE range. Contact field
                  medic if sync fails after retry.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
