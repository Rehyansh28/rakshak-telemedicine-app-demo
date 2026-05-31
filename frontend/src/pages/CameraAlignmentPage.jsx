import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Scan, CheckCircle } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/AppContext';

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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <p className="label-caps text-secondary mb-2">Step 2 of 3</p>
        <h1 className="font-sora text-2xl md:text-3xl font-bold text-primary">Camera Alignment</h1>
        <p className="text-on-surface-variant mt-2 text-sm">Position face within the tactical HUD frame</p>
      </motion.div>

      <div className="relative w-full max-w-md mx-auto aspect-[3/4] rounded-2xl overflow-hidden border-2 border-secondary-container/50 bg-primary-container/5 mb-8">
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera className="w-16 h-16 text-secondary/40" />
        </div>
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
          <div
            key={pos}
            className={`absolute w-8 h-8 border-secondary border-2 ${
              pos.includes('top') ? 'top-4 border-b-0' : 'bottom-4 border-t-0'
            } ${pos.includes('left') ? 'left-4 border-r-0' : 'right-4 border-l-0'}`}
          />
        ))}
        {scanning && <div className="absolute inset-0 scan-line pointer-events-none" />}
        {aligned && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#16a34a]/10 flex items-center justify-center"
          >
            <CheckCircle className="w-16 h-16 text-[#16a34a]" />
          </motion.div>
        )}
      </div>

      <GlassCard className="mb-6 max-w-md mx-auto">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Lighting</span>
            <span className="font-mono text-[#16a34a]">Optimal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Face Detection</span>
            <span className={aligned ? 'font-mono text-[#16a34a]' : 'text-on-surface-variant'}>
              {aligned ? 'Locked' : 'Searching...'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Encryption</span>
            <span className="font-mono text-secondary">AES-256 Active</span>
          </div>
        </div>
      </GlassCard>

      <div className="max-w-md mx-auto">
        {!aligned ? (
          <Button onClick={startScan} loading={scanning} icon={Scan} className="w-full">
            {scanning ? 'Scanning...' : 'Initiate Face Scan'}
          </Button>
        ) : (
          <Button onClick={() => navigate(PATHS.patient.waitingRoom)} className="w-full">
            Enter Waiting Room
          </Button>
        )}
      </div>
    </div>
  );
}
