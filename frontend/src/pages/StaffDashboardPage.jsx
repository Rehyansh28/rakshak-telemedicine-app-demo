import { useNavigate } from 'react-router-dom';
import { Users, Activity, Clock, ArrowRight, UserCircle } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/useApp';

export default function StaffDashboardPage() {
  const navigate = useNavigate();
  const { staff, patientList, selectedPatient, setSensorProgress } = useApp();

  const inQueue = patientList.filter((p) => p.status === 'consultation').length;

  const continueSession = () => {
    if (!selectedPatient?.id) return;
    navigate(PATHS.staff.sensors);
  };

  const startSession = () => {
    if (selectedPatient?.id) {
      setSensorProgress(0);
      navigate(PATHS.staff.sensors);
    } else {
      navigate(PATHS.staff.patients);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Staff Dashboard"
        description={`Welcome, ${staff?.name || 'Medical Staff'} · ${staff?.post || staff?.rank || ''}`}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5">
          <Users className="w-8 h-8 text-secondary mb-2" />
          <p className="font-sora text-3xl font-bold text-primary">{patientList.length}</p>
          <p className="label-caps text-[10px] text-on-surface-variant">Registered soldiers</p>
        </GlassCard>
        <GlassCard className="p-5">
          <Clock className="w-8 h-8 text-secondary mb-2" />
          <p className="font-sora text-3xl font-bold text-primary">{inQueue}</p>
          <p className="label-caps text-[10px] text-on-surface-variant">Awaiting doctor</p>
        </GlassCard>
        <GlassCard className="p-5 sm:col-span-2 lg:col-span-1">
          <UserCircle className="w-8 h-8 text-secondary mb-2" />
          <p className="font-sora text-lg font-bold text-primary truncate">
            {selectedPatient?.name || 'None selected'}
          </p>
          <p className="label-caps text-[10px] text-on-surface-variant">Active soldier session</p>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="font-sora font-semibold text-primary mb-4">Quick actions</h3>
          <div className="flex flex-col gap-3">
            <Button icon={Users} onClick={() => navigate(PATHS.staff.patients)}>
              Manage soldiers
            </Button>
            <Button variant="secondary" icon={Activity} onClick={startSession}>
              {selectedPatient ? 'Continue sensor setup' : 'Select soldier to begin'}
            </Button>
          </div>
        </GlassCard>

        {selectedPatient && (
          <GlassCard className="p-6 border-2 border-secondary/30">
            <p className="label-caps text-secondary text-[10px] mb-2">Active session</p>
            <p className="font-sora text-xl font-bold text-primary">{selectedPatient.name}</p>
            <p className="font-mono text-sm text-secondary">{selectedPatient.id}</p>
            <p className="text-sm text-on-surface-variant mt-2">
              {selectedPatient.rank} · {selectedPatient.regiment}
            </p>
            <ul className="mt-4 space-y-2 text-xs text-on-surface-variant">
              <li>1. Sensor connection</li>
              <li>2. Camera alignment</li>
              <li>3. Doctor handoff (waiting room)</li>
            </ul>
            <Button className="mt-4 w-full" icon={ArrowRight} onClick={continueSession}>
              Continue session
            </Button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
