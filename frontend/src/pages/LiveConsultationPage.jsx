import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2, MessageSquare, Scan, FileText, Brain } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import LiveCameraPreview from '../components/camera/LiveCameraPreview';
import StatusBadge from '../components/ui/StatusBadge';
import MiniECG from '../components/charts/MiniECG';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/useApp';

export default function LiveConsultationPage() {
  const navigate = useNavigate();
  const {
    selectedPatient,
    setSelectedPatient,
    patientList,
    loading,
    vitals,
    consultationControls,
    updateConsultationControl,
    showToast,
  } = useApp();

  useEffect(() => {
    if (selectedPatient || patientList.length === 0) return;
    const inConsultation = patientList.find((p) => p.status === 'consultation');
    const critical = patientList.find((p) => p.status === 'critical');
    setSelectedPatient(inConsultation || critical || patientList[0]);
  }, [selectedPatient, patientList, setSelectedPatient]);

  const { micMuted, videoOn, chatOpen } = consultationControls;

  if (loading) {
    return (
      <PageContainer>
        <p className="text-on-surface-variant text-sm">Loading live consultation...</p>
      </PageContainer>
    );
  }

  if (!selectedPatient) {
    return (
      <PageContainer>
        <PageHeader
          title="Live Consultation"
          description="No active patient selected"
          breadcrumbs={[
            { label: 'Command Center', to: PATHS.doctor.dashboard },
            { label: 'Live Consultation' },
          ]}
        />
        <p className="text-sm text-on-surface-variant">
          Select a soldier from{' '}
          <Button to={PATHS.doctor.patients} variant="secondary" size="sm" className="inline-flex">
            Active Patients
          </Button>{' '}
          to start a consultation.
        </p>
      </PageContainer>
    );
  }

  const handleEndCall = () => {
    showToast('Consultation ended — returning to command center', 'success');
    navigate(PATHS.doctor.dashboard);
  };

  const toolbar = [
    {
      icon: micMuted ? MicOff : Mic,
      label: 'Mic',
      onClick: () => {
        updateConsultationControl('micMuted', !micMuted);
        showToast(micMuted ? 'Microphone enabled' : 'Microphone muted', 'info');
      },
      active: !micMuted,
    },
    {
      icon: videoOn ? Video : VideoOff,
      label: 'Video',
      onClick: () => {
        updateConsultationControl('videoOn', !videoOn);
        showToast(videoOn ? 'Camera off' : 'Camera on', 'info');
      },
      active: videoOn,
    },
    { icon: PhoneOff, label: 'End', onClick: handleEndCall, danger: true },
    {
      icon: Maximize2,
      label: 'Fullscreen',
      onClick: () => showToast('Fullscreen mode (demo)', 'info'),
    },
    {
      icon: MessageSquare,
      label: 'Chat',
      onClick: () => {
        updateConsultationControl('chatOpen', !chatOpen);
        showToast(chatOpen ? 'Chat closed' : 'Tactical chat opened', 'info');
      },
      active: chatOpen,
    },
  ];

  return (
    <PageContainer fullHeight>
      <PageHeader
        title={`Consultation — ${selectedPatient.name}`}
        description={selectedPatient.id}
        breadcrumbs={[
          { label: 'Command Center', to: PATHS.doctor.dashboard },
          { label: 'Active Patients', to: PATHS.doctor.patients },
          { label: 'Live Consultation' },
        ]}
        actions={
          <Button to={PATHS.doctor.arDiagnostic} icon={Scan}>
            Launch AR Scan
          </Button>
        }
        className="mb-4 shrink-0"
      />

      <div className="flex items-center gap-2 mb-4 shrink-0">
        <StatusBadge status="consultation" label="LIVE UPLINK" />
        {!videoOn && <StatusBadge status="warning" label="VIDEO PAUSED" />}
        {micMuted && <StatusBadge status="monitoring" label="MIC MUTED" />}
      </div>

      <div className="flex-1 grid lg:grid-cols-3 gap-4 min-h-0">
        <div className="lg:col-span-2 relative rounded-xl overflow-hidden bg-primary-container/10 border border-outline-variant/30 min-h-[280px]">
          <LiveCameraPreview active={videoOn} className="absolute inset-0 min-h-[280px]">
            {videoOn && (
              <div className="absolute bottom-20 left-4 z-10 glass-panel px-3 py-2 rounded-lg max-w-[200px]">
                <p className="label-caps text-[10px] text-secondary">Patient uplink</p>
                <p className="text-xs text-on-surface-variant truncate">{selectedPatient.name}</p>
                <p className="text-[10px] text-on-surface-variant/80">{selectedPatient.location}</p>
              </div>
            )}
          </LiveCameraPreview>
          <div className="absolute top-4 left-4 glass-panel px-3 py-2 rounded-lg z-20">
            <span className="label-caps text-[10px] text-error flex items-center gap-1">
              <span className="w-2 h-2 bg-error rounded-full animate-pulse" />
              REC · LIVE
            </span>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {toolbar.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                title={item.label}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  item.danger
                    ? 'bg-error text-white'
                    : item.active
                      ? 'glass-panel text-primary ring-2 ring-secondary/40'
                      : 'glass-panel text-on-surface-variant hover:text-primary'
                }`}
              >
                <item.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto scrollbar-hide">
          {chatOpen && (
            <GlassCard>
              <p className="label-caps text-secondary mb-2">Tactical Chat</p>
              <p className="text-xs text-on-surface-variant">Field medic: Patient stable, O2 initiated.</p>
            </GlassCard>
          )}
          <GlassCard>
            <p className="label-caps text-on-surface-variant mb-2">Live Vitals</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Heart Rate</span>
                <span className="font-mono font-bold text-error">{vitals.heartRate} BPM</span>
              </div>
              <div className="flex justify-between">
                <span>SpO2</span>
                <span className="font-mono font-bold text-secondary">{vitals.spo2}%</span>
              </div>
              <div className="flex justify-between">
                <span>Temperature</span>
                <span className="font-mono font-bold">{vitals.temp}°C</span>
              </div>
            </div>
            <div className="mt-4">
              <MiniECG height={60} />
            </div>
          </GlassCard>
          <GlassCard>
            <p className="label-caps text-on-surface-variant mb-2">Tactical Notes</p>
            <textarea
              className="w-full h-24 bg-transparent border border-outline-variant/30 rounded-lg p-3 text-sm resize-none outline-none focus:border-secondary"
              placeholder="Enter consultation notes..."
              defaultValue="Patient reports dizziness and shortness of breath at 14,200 ft."
            />
          </GlassCard>
          <div className="flex flex-col gap-2">
            <Button to={PATHS.doctor.aiInsights} variant="secondary" icon={Brain} className="w-full">
              AI Insights
            </Button>
            <Button to={PATHS.doctor.report} variant="ghost" icon={FileText} className="w-full">
              Generate Report
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
