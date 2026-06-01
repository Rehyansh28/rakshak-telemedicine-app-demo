import { useNavigate } from 'react-router-dom';
import HumanBody3D from '../components/ar/HumanBody3D';
import OrganInfoPanel from '../components/ar/OrganInfoPanel';
import MetricWidget from '../components/ui/MetricWidget';
import MiniECG from '../components/charts/MiniECG';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/appContext';

const ORGANS = ['heart', 'lungs', 'brain', 'chest', 'arms', 'legs', 'nose'];

export default function ARDiagnosticPage() {
  const navigate = useNavigate();
  const { vitals, selectedOrgan, setSelectedOrgan } = useApp();

  const handleOrganClick = (organId) => {
    setSelectedOrgan(organId);
  };

  return (
    <PageContainer fullHeight className="flex flex-col overflow-hidden">
      <PageHeader
        eyebrow="RAKSHAK XR HUD"
        title="AR Human Body Diagnostic"
        breadcrumbs={[
          { label: 'Command Center', to: PATHS.doctor.dashboard },
          { label: 'Live Consultation', to: PATHS.doctor.consultation },
          { label: 'AR Diagnostic' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate(PATHS.doctor.consultation)}>
              Back to Consultation
            </Button>
            <Button to={PATHS.doctor.aiInsights} variant="secondary">
              AI Insights
            </Button>
          </div>
        }
        className="mb-4 shrink-0"
      />

      <section className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        <div className="w-full lg:w-72 flex flex-col gap-3 overflow-y-auto scrollbar-hide shrink-0">
          <MetricWidget label="ECG / Heart Rate" value={vitals.heartRate} unit="BPM" live />
          <div className="glass-card rounded-xl p-2">
            <MiniECG height={50} />
          </div>
          <MetricWidget label="SpO2" value={vitals.spo2} unit="%" progress={vitals.spo2} />
          <MetricWidget label="Blood Pressure" value={`${vitals.bpSystolic}/${vitals.bpDiastolic}`} unit="mmHg" />
          <MetricWidget label="Respiration" value={vitals.respiration} unit="BRPM" borderAccent />
        </div>

        <div className="flex-1 relative min-h-[280px]">
          <HumanBody3D onOrganClick={handleOrganClick} activeOrgan={selectedOrgan} />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 label-caps text-[10px] text-on-surface-variant bg-white/90 px-4 py-2 rounded-full shadow-sm">
            Click organ hotspots · Open full diagnostic from panel
          </p>
        </div>

        <div className="hidden lg:flex flex-col w-56 gap-2 overflow-y-auto shrink-0">
          {ORGANS.map((org) => (
            <button
              key={org}
              type="button"
              onClick={() => handleOrganClick(org)}
              className={`glass-card rounded-lg p-3 text-left label-caps text-[10px] transition-all ${
                selectedOrgan === org ? 'ring-2 ring-secondary-container' : 'hover:ring-1 hover:ring-secondary/30'
              }`}
            >
              {org.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <OrganInfoPanel organId={selectedOrgan} onClose={() => setSelectedOrgan(null)} />
    </PageContainer>
  );
}
