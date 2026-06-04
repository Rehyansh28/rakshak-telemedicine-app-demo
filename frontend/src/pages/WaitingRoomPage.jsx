import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, staffApiPost } from '../api/client';
import { motion } from 'framer-motion';
import {
  Clock,
  Users,
  Shield,
  Heart,
  Video,
  MessageSquare,
  ArrowLeft,
  Bell,
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import MiniECG from '../components/charts/MiniECG';
import Button from '../components/ui/Button';
import PatientPageHeader from '../components/layout/PatientPageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/useApp';

export default function WaitingRoomPage() {
  const navigate = useNavigate();
  const { vitals, showToast, selectedPatient } = useApp();
  const [queuePosition, setQueuePosition] = useState(2);
  const [waitTime, setWaitTime] = useState(4);

  useEffect(() => {
    if (!selectedPatient?.id) return;
    apiGet(`/queue/${selectedPatient.id}/`)
      .then((data) => {
        setQueuePosition(data.queuePosition);
        setWaitTime(data.waitTime);
      })
      .catch(() => {});
  }, [selectedPatient?.id]);

  const notifyDoctor = async () => {
    if (!selectedPatient?.id) return;
    try {
      const data = await staffApiPost(`/queue/${selectedPatient.id}/enqueue/`, {});
      setQueuePosition(data.queuePosition);
      setWaitTime(data.waitTime);
      showToast(
        `${selectedPatient.name} is in queue (#${data.queuePosition}) — doctor notified`,
        'success'
      );
    } catch (e) {
      showToast(e.message || 'Could not add to queue', 'info');
    }
  };

  return (
    <div>
      <PatientPageHeader
        eyebrow="Connect to Doctor · Handoff"
        title="Doctor Handoff — Waiting Room"
        description="Keep the soldier connected while they wait for a medical officer. You may assist with positioning, vitals checks, and relaying messages during the consultation."
        actions={<StatusBadge status="consultation" label="IN QUEUE" />}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="bg-white text-center py-10">
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-24 h-24 rounded-full bg-secondary-container/15 border-2 border-secondary-container flex items-center justify-center mx-auto mb-6"
            >
              <Users className="w-12 h-12 text-secondary" />
            </motion.div>
            <p className="label-caps text-secondary mb-2">Awaiting Doctor</p>
            <p className="font-sora text-2xl font-bold text-primary">Position #{queuePosition} in queue</p>
            <p className="text-on-surface-variant text-sm mt-2">
              Estimated wait: ~{waitTime} minutes · Keep bio-suit sensors attached on the soldier
            </p>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mt-6 flex justify-center gap-1"
            >
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-secondary-container" />
              ))}
            </motion.div>
          </GlassCard>

          <GlassCard className="bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-error" />
              <span className="label-caps text-on-surface-variant text-[10px]">Live Bio-Suit Vitals</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div className="p-3 rounded-lg bg-surface-container-low">
                <p className="text-2xl font-bold font-mono text-error">{vitals.heartRate}</p>
                <p className="text-[10px] text-on-surface-variant">BPM</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low">
                <p className="text-2xl font-bold font-mono text-secondary">{vitals.spo2}%</p>
                <p className="text-[10px] text-on-surface-variant">SpO2</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low">
                <p className="text-2xl font-bold font-mono">{vitals.temp}°</p>
                <p className="text-[10px] text-on-surface-variant">Temp</p>
              </div>
            </div>
            <MiniECG height={56} />
          </GlassCard>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(PATHS.staff.camera)} className="flex-1">
              Back
            </Button>
            <Button onClick={notifyDoctor} icon={Bell} className="flex-[2]">
              Notify Doctor — Patient Ready
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <GlassCard className="bg-white text-center py-4">
              <Clock className="w-6 h-6 text-secondary mx-auto mb-2" />
              <p className="label-caps text-[10px] text-on-surface-variant">Queue</p>
              <p className="font-sora text-2xl font-bold text-primary">#{queuePosition}</p>
            </GlassCard>
            <GlassCard className="bg-white text-center py-4">
              <p className="label-caps text-[10px] text-on-surface-variant">Wait</p>
              <p className="font-sora text-2xl font-bold text-primary">~{waitTime}m</p>
            </GlassCard>
          </div>

          <GlassCard className="bg-white">
            <p className="label-caps text-on-surface-variant text-[10px] mb-3">Active Soldier</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Name</span>
                <span className="font-semibold text-primary text-xs truncate ml-2">{selectedPatient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">ID</span>
                <span className="font-mono text-xs font-bold truncate ml-2">{selectedPatient.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Altitude</span>
                <span className="font-mono text-xs">{selectedPatient.altitude.toLocaleString()} ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Location</span>
                <span className="text-xs text-right max-w-[140px] truncate">{selectedPatient.location}</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="bg-white">
            <div className="flex gap-3">
              <Shield className="w-6 h-6 text-secondary shrink-0" />
              <p className="text-xs text-on-surface-variant leading-relaxed">
                STRAT-LINK encryption active. Vitals stream securely to the doctor command center. Soldiers do not
                log in to this portal — staff manage the session end-to-end.
              </p>
            </div>
          </GlassCard>

          <GlassCard className="bg-white">
            <p className="label-caps text-on-surface-variant text-[10px] mb-3">Staff Checklist</p>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-secondary" />
                Keep soldier calm and seated
              </li>
              <li className="flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-secondary" />
                Verify sensors remain attached
              </li>
              <li className="flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-secondary" />
                Camera active when doctor joins
              </li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
