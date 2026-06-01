import { useEffect, useState } from 'react';
import { Brain, Mountain, Heart, Zap, Shield } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import VitalsChart from '../components/charts/VitalsChart';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/appContext';
import { motion } from 'framer-motion';
import { apiGet } from '../api/client';

function RiskGauge({ label, value, icon: Icon, color }) {
  return (
    <GlassCard>
      <div className="flex justify-between items-start mb-4">
        <Icon className={`w-6 h-6 ${color}`} />
        <span className="label-caps text-[10px] text-on-surface-variant">{label}</span>
      </div>
      <div className="relative w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${value > 70 ? 'bg-error' : value > 50 ? 'bg-amber-500' : 'bg-[#16a34a]'}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1 }}
        />
      </div>
      <p className="font-sora text-3xl font-bold text-primary mt-3">{value}%</p>
    </GlassCard>
  );
}

export default function AIInsightsPage() {
  const { selectedPatient } = useApp();
  const [aiInsights, setAiInsights] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (!selectedPatient?.id) return;
    Promise.all([
      apiGet(`/patients/${selectedPatient.id}/ai-insights/`),
      apiGet(`/ai-recommendations/?patient=${selectedPatient.id}`),
    ]).then(([insights, recs]) => {
      setAiInsights(insights);
      setRecommendations(recs);
    });
  }, [selectedPatient?.id]);

  if (!selectedPatient || !aiInsights) {
    return (
      <PageContainer>
        <p className="text-on-surface-variant text-sm">Loading AI insights...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dharma AI Engine"
        title="AI Medical Insights"
        description={`${selectedPatient.id} · Predictive analytics active`}
        breadcrumbs={[
          { label: 'Command Center', to: PATHS.doctor.dashboard },
          { label: 'AI Insights' },
        ]}
        actions={
          <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg">
            <Shield className="w-4 h-4 text-secondary" />
            <span className="label-caps text-[10px]">Readiness: {aiInsights.readiness}%</span>
          </div>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <RiskGauge label="Fatigue" value={aiInsights.fatiguePrediction} icon={Zap} color="text-amber-500" />
        <RiskGauge label="Altitude Sickness" value={aiInsights.altitudeSicknessRisk} icon={Mountain} color="text-error" />
        <RiskGauge label="Cardiac Risk" value={aiInsights.cardiacRisk} icon={Heart} color="text-error" />
        <RiskGauge label="Stress Score" value={aiInsights.stressScore} icon={Brain} color="text-secondary" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <GlassCard>
          <h2 className="label-caps text-on-surface-variant mb-4">Heart Rate Trend</h2>
          <VitalsChart data={aiInsights.trends.heartRate} dataKey="v" color="#ba1a1a" />
        </GlassCard>
        <GlassCard>
          <h2 className="label-caps text-on-surface-variant mb-4">SpO2 Trend</h2>
          <VitalsChart data={aiInsights.trends.spo2} dataKey="v" color="#00dbe9" />
        </GlassCard>
      </div>

      <GlassCard className="mb-8">
        <h2 className="label-caps text-secondary mb-4">AI Recommendations</h2>
        <ul className="space-y-3">
          {recommendations.map((rec, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-3 p-3 bg-surface-container-low rounded-lg text-sm"
            >
              <span className="text-secondary font-bold">{i + 1}.</span>
              {rec}
            </motion.li>
          ))}
        </ul>
      </GlassCard>

      <div className="flex flex-wrap gap-4">
        <Button to={PATHS.doctor.report}>Generate Clinical Report</Button>
        <Button to={PATHS.doctor.dashboard} variant="ghost">
          Back to Dashboard
        </Button>
      </div>
    </PageContainer>
  );
}
