import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera,
  Scan,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sun,
  ScanFace,
  Shield,
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import PatientPageHeader from '../components/layout/PatientPageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/useApp';

export default function CameraAlignmentPage() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [aligned, setAligned] = useState(false);
  const [scanning, setScanning] = useState(false);

  const startScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setAligned(true);
      showToast('Face scan complete — alignment locked', 'success');
    }, 2500);
  };

  return (
    <div>
      <PatientPageHeader
        eyebrow="Identity Verification · Step 2 of 3"
        title="Camera Alignment"
        description="Position your face within the tactical HUD frame for secure telemedicine uplink."
        actions={
          <StatusBadge status={aligned ? 'connected' : scanning ? 'syncing' : 'pending'} label={aligned ? 'LOCKED' : scanning ? 'SCANNING' : 'READY'} />
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="bg-white p-4">
            <div className="relative w-full max-w-lg mx-auto aspect-[4/5] rounded-2xl overflow-hidden border-2 border-secondary-container/60 bg-primary-container/5">
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className={`w-20 h-20 ${aligned ? 'text-[#16a34a]/40' : 'text-secondary/30'}`} />
              </div>
              {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
                <div
                  key={pos}
                  className={`absolute w-10 h-10 border-secondary border-2 ${
                    pos.includes('top') ? 'top-5 border-b-0' : 'bottom-5 border-t-0'
                  } ${pos.includes('left') ? 'left-5 border-r-0' : 'right-5 border-l-0'}`}
                />
              ))}
              <div className="absolute inset-x-8 top-1/2 h-px bg-secondary/20" />
              <div className="absolute inset-y-8 left-1/2 w-px bg-secondary/20" />
              {scanning && <div className="absolute inset-0 scan-line pointer-events-none" />}
              {aligned && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-[#16a34a]/10 flex flex-col items-center justify-center gap-2"
                >
                  <CheckCircle className="w-16 h-16 text-[#16a34a]" />
                  <span className="label-caps text-[10px] text-[#16a34a]">Alignment Locked</span>
                </motion.div>
              )}
            </div>
          </GlassCard>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(PATHS.patient.sensors)} className="sm:flex-1">
              Back to Sensors
            </Button>
            {!aligned ? (
              <Button onClick={startScan} loading={scanning} icon={Scan} className="sm:flex-[2]">
                {scanning ? 'Scanning...' : 'Initiate Face Scan'}
              </Button>
            ) : (
              <Button icon={ArrowRight} onClick={() => navigate(PATHS.patient.waitingRoom)} className="sm:flex-[2]">
                Enter Waiting Room
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <GlassCard className="bg-white">
            <p className="label-caps text-on-surface-variant text-[10px] mb-4">Calibration Checks</p>
            <div className="space-y-3">
              {[
                { icon: Sun, label: 'Lighting', value: 'Optimal', ok: true },
                { icon: ScanFace, label: 'Face Detection', value: aligned ? 'Locked' : scanning ? 'Scanning' : 'Ready', ok: aligned },
                { icon: Shield, label: 'Encryption', value: 'AES-256', ok: true },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm py-2 border-b border-outline-variant/10 last:border-0">
                  <span className="flex items-center gap-2 text-on-surface-variant">
                    <row.icon className="w-4 h-4" />
                    {row.label}
                  </span>
                  <span className={`font-mono text-xs font-bold ${row.ok ? 'text-[#16a34a]' : 'text-on-surface-variant'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="bg-white">
            <p className="label-caps text-secondary text-[10px] mb-2">Instructions</p>
            <ol className="text-xs text-on-surface-variant space-y-2 list-decimal list-inside">
              <li>Remove helmet and face coverings</li>
              <li>Center face in the HUD frame</li>
              <li>Hold still during scan (~3 sec)</li>
              <li>Wait for green lock confirmation</li>
            </ol>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
