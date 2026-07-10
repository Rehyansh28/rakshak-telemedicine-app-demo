import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scan, FileText, Brain } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import MiniECG from '../components/charts/MiniECG';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/useApp';
import VideoCall from '../components/VideoCall/VideoCall';

export default function LiveConsultationPage() {
  const navigate = useNavigate();
  const {
    selectedPatient,
    setSelectedPatient,
    patientList,
    loading,
    vitals,
    consultationControls,
    localStream,
    remoteStream,
    activeCall,
    connectionStatus,
    endCall,
    toggleMic,
    toggleVideo,
  } = useApp();

  useEffect(() => {
    if (selectedPatient || patientList.length === 0) return;
    const inConsultation = patientList.find((p) => p.status === 'consultation');
    const critical = patientList.find((p) => p.status === 'critical');
    setSelectedPatient(inConsultation || critical || patientList[0]);
  }, [selectedPatient, patientList, setSelectedPatient]);

  const { videoOn, micMuted, chatOpen } = consultationControls;

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

  const handleEndCall = async () => {
    await endCall();
    navigate(PATHS.doctor.dashboard);
  };

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

      <div className="flex-1 grid lg:grid-cols-3 gap-4 min-h-0">
        <div className="lg:col-span-2 min-h-[350px]">
          <VideoCall
            localStream={localStream}
            remoteStream={remoteStream}
            call={activeCall}
            connectionStatus={connectionStatus}
            micMuted={micMuted}
            videoOn={videoOn}
            onToggleMic={toggleMic}
            onToggleVideo={toggleVideo}
            onEndCall={handleEndCall}
            label={selectedPatient.name}
          />
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
