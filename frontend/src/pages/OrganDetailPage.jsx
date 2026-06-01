import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Volume2 } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import MiniECG from '../components/charts/MiniECG';
import VitalsChart from '../components/charts/VitalsChart';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/useApp';
import { apiGet } from '../api/client';

export default function OrganDetailPage() {
  const { organId = 'heart' } = useParams();
  const { selectedPatient, vitals, showToast } = useApp();
  const [organData, setOrganData] = useState({});
  const [aiInsights, setAiInsights] = useState(null);
  const [playing, setPlaying] = useState(false);
  const audioBars = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => {
        const wave = 0.5 + 0.5 * Math.sin(i * 1.7);
        return 20 + wave * 40;
      }),
    []
  );

  useEffect(() => {
    if (!selectedPatient?.id) return;
    Promise.all([
      apiGet(`/patients/${selectedPatient.id}/organs/`),
      apiGet(`/patients/${selectedPatient.id}/ai-insights/`),
    ]).then(([organs, insights]) => {
      setOrganData(organs);
      setAiInsights(insights);
    });
  }, [selectedPatient?.id]);

  if (!selectedPatient || !aiInsights) {
    return (
      <PageContainer>
        <p className="text-on-surface-variant text-sm">Loading organ data...</p>
      </PageContainer>
    );
  }

  const data = organData[organId] || organData.heart || {};
  const organLabel = data.label || organId;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Organ Deep Dive"
        title={organLabel}
        description={`${selectedPatient.name} · ${selectedPatient.id}`}
        breadcrumbs={[
          { label: 'Command Center', to: PATHS.doctor.dashboard },
          { label: 'AR Diagnostic', to: PATHS.doctor.arDiagnostic },
          { label: organLabel },
        ]}
        actions={
          <Button to={PATHS.doctor.arDiagnostic} variant="ghost">
            Back to AR
          </Button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {(organId === 'heart' || !organData[organId]) && (
          <GlassCard className="ecg-grid lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-sora font-semibold text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-secondary" />
                Live ECG Waveform
              </h2>
              <span className="label-caps text-secondary animate-pulse">LIVE</span>
            </div>
            <MiniECG height={180} patientId={selectedPatient.id} ecgPoints={data.ecgPoints} />
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div>
                <p className="label-caps text-[10px] text-on-surface-variant">BPM</p>
                <p className="font-sora text-4xl font-bold text-primary">{vitals.heartRate}</p>
              </div>
              <div>
                <p className="label-caps text-[10px] text-on-surface-variant">Rhythm</p>
                <p className="font-mono text-sm font-bold">{data.rhythm || 'Sinus'}</p>
              </div>
              <div>
                <p className="label-caps text-[10px] text-on-surface-variant">Risk</p>
                <p className="font-mono text-sm font-bold text-error">{data.risk}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {organId === 'heart' && (
          <GlassCard>
            <h2 className="font-sora font-semibold text-lg mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-secondary" />
              Stetho-Sync Audio
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">{data.sound}</p>
            <div className="h-24 bg-surface-container-low rounded-lg flex items-end justify-center gap-1 p-4">
              {Array.from({ length: 32 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-secondary rounded-full"
                  animate={{
                      height: playing ? [8, audioBars[i], 8] : 8,
                  }}
                  transition={{ repeat: playing ? Infinity : 0, duration: 0.8, delay: i * 0.03 }}
                />
              ))}
            </div>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => {
                setPlaying(!playing);
                showToast(playing ? 'Playback stopped' : 'Playing heart sound sample', 'info');
              }}
            >
              {playing ? 'Stop' : 'Play Heart Sound Sample'}
            </Button>
          </GlassCard>
        )}

        {organId !== 'heart' && (
          <GlassCard>
            <h2 className="font-sora font-semibold text-lg mb-4">{organLabel} Metrics</h2>
            {Object.entries(data)
              .filter(([k]) => !['label', 'ecgPoints'].includes(k))
              .map(([k, v]) => (
                <div key={k} className="flex justify-between py-3 border-b border-outline-variant/20 last:border-0 capitalize">
                  <span className="text-on-surface-variant">{k}</span>
                  <span className="font-mono font-bold">{String(v)}</span>
                </div>
              ))}
          </GlassCard>
        )}

        <GlassCard className={organId === 'heart' ? '' : 'lg:col-span-2'}>
          <h2 className="label-caps text-on-surface-variant mb-4">24h Trend</h2>
          <VitalsChart
            data={organId === 'brain' ? aiInsights.trends.stress : aiInsights.trends.heartRate}
            dataKey="v"
            color={organId === 'brain' ? '#006970' : '#ba1a1a'}
            height={220}
          />
        </GlassCard>

        <div className="lg:col-span-2 flex flex-wrap gap-4">
          <Button to={PATHS.doctor.aiInsights} className="flex-1 min-w-[200px]">
            AI Analysis
          </Button>
          <Button to={PATHS.doctor.report} variant="secondary" className="flex-1 min-w-[200px]">
            Generate Report
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
