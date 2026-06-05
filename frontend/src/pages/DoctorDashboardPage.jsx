import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Users, Activity, Brain, FileText, ArrowRight, Mountain, Scan } from 'lucide-react';
import PatientCard from '../components/patient/PatientCard';
import GlassCard from '../components/ui/GlassCard';
import StatusBadge from '../components/ui/StatusBadge';
import MiniECG from '../components/charts/MiniECG';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/useApp';
import { apiGet } from '../api/client';

export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const { selectedPatient, setSelectedPatient, vitals, patientList, showToast, loading } = useApp();
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState({
    activeConsultations: 0,
    criticalAlerts: 0,
    aiRecommendations: 0,
    reportsToday: 0,
  });

  useEffect(() => {
    Promise.all([
      apiGet('/emergency-alerts/'),
      apiGet('/ai-recommendations/'),
      apiGet('/activity/'),
      apiGet('/dashboard/stats/'),
    ])
      .then(([alerts, recs, activity, dashboardStats]) => {
        setEmergencyAlerts(alerts);
        setAiRecommendations(recs);
        setRecentActivity(activity);
        setStats(dashboardStats);
      })
      .catch(() => showToast('Failed to load dashboard data', 'info'));
  }, [showToast]);

  const statLinks = [
    {
      label: 'Active Consultations',
      value: String(stats.activeConsultations),
      icon: Activity,
      color: 'text-secondary',
      to: PATHS.doctor.consultation,
    },
    {
      label: 'Critical Alerts',
      value: String(stats.criticalAlerts),
      icon: AlertTriangle,
      color: 'text-error',
      to: PATHS.doctor.patients,
    },
    {
      label: 'AI Recommendations',
      value: String(stats.aiRecommendations),
      icon: Brain,
      color: 'text-primary',
      to: PATHS.doctor.aiInsights,
    },
    {
      label: 'Reports Today',
      value: String(stats.reportsToday),
      icon: FileText,
      color: 'text-[#5398eb]',
      to: PATHS.doctor.report,
    },
  ];

  const openConsultation = (patient) => {
    setSelectedPatient(patient);
    navigate(PATHS.doctor.consultation);
  };

  const handleAlert = (alert) => {
    const patient = patientList.find((p) => p.id === alert.soldierId);
    if (patient) openConsultation(patient);
    else showToast('Patient record loaded', 'info');
  };

  if (loading) {
    return (
      <PageContainer>
        <p className="text-on-surface-variant text-sm">Loading command center...</p>
      </PageContainer>
    );
  }

  const priorityPatient = selectedPatient ?? patientList[0] ?? null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Strategic Health Intelligence"
        title="Command Center"
        description="Real-time battlefield medical oversight · Dharma AI Active"
        breadcrumbs={[{ label: 'Command Center', to: PATHS.doctor.dashboard }]}
        actions={
          <>
            <Button to={PATHS.doctor.patients} icon={Users}>
              Active Patients
            </Button>
            <Button to={PATHS.doctor.arDiagnostic} variant="secondary" icon={Scan}>
              AR Diagnostic
            </Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {statLinks.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard hover onClick={() => navigate(stat.to)} className="h-full text-left">
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                  <p className="label-caps text-[10px] text-on-surface-variant">{stat.label}</p>
                  <p className="font-sora text-3xl font-bold text-primary">{stat.value}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <GlassCard>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-sora font-semibold text-lg text-primary">Priority Patient Vitals</h2>
              {priorityPatient && <StatusBadge status="critical" label="LIVE MONITOR" />}
            </div>
            {priorityPatient ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="font-mono text-xs text-secondary mb-1">{priorityPatient.id}</p>
                <h3 className="font-sora text-xl font-bold">{priorityPatient.name}</h3>
                <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-1">
                  <Mountain className="w-4 h-4" />
                  {priorityPatient.altitude.toLocaleString()} ft · High Altitude Warning
                </p>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="label-caps text-[10px] text-on-surface-variant">HR</p>
                    <p className="font-mono text-2xl font-bold text-error">{vitals.heartRate}</p>
                  </div>
                  <div>
                    <p className="label-caps text-[10px] text-on-surface-variant">SpO2</p>
                    <p className="font-mono text-2xl font-bold text-secondary">{vitals.spo2}%</p>
                  </div>
                  <div>
                    <p className="label-caps text-[10px] text-on-surface-variant">Temp</p>
                    <p className="font-mono text-2xl font-bold">{vitals.temp}°</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  icon={ArrowRight}
                  onClick={() => navigate(PATHS.doctor.arDiagnostic)}
                >
                  View AR Vitals
                </Button>
              </div>
              <MiniECG height={100} patientId={priorityPatient.id} />
            </div>
            ) : (
              <p className="text-sm text-on-surface-variant">
                No soldiers registered yet. Add patients via Super Admin or run{' '}
                <code className="text-xs bg-surface-container-high px-1 rounded">python manage.py seed_demo</code>.
              </p>
            )}
          </GlassCard>

          <div>
            <h2 className="font-sora font-semibold text-lg text-primary mb-4">Soldier Status</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {patientList.slice(0, 4).map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  selected={priorityPatient?.id === p.id}
                  onClick={() => openConsultation(p)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="border-l-4 border-l-error">
            <h2 className="label-caps text-error mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Emergency Alerts
            </h2>
            <div className="space-y-3">
              {emergencyAlerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => handleAlert(alert)}
                  className="w-full text-left p-3 bg-error-container/30 rounded-lg hover:ring-2 hover:ring-error/20 transition-all"
                >
                  <div className="flex justify-between">
                    <p className="font-semibold text-sm">{alert.title}</p>
                    <span className="text-[10px] text-on-surface-variant">{alert.time}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">{alert.message}</p>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="label-caps text-secondary mb-4">Dharma AI Recommendations</h2>
            <ul className="space-y-2">
              {aiRecommendations.map((rec, i) => (
                <li key={i} className="text-sm flex gap-2 text-on-surface-variant">
                  <span className="text-secondary">›</span>
                  {rec}
                </li>
              ))}
            </ul>
            <Button to={PATHS.doctor.aiInsights} variant="ghost" size="sm" className="mt-4 w-full">
              View all insights
            </Button>
          </GlassCard>

          <GlassCard>
            <h2 className="label-caps text-on-surface-variant mb-4">Recent Activity</h2>
            {recentActivity.map((item, i) => (
              <div key={i} className="py-2 border-b border-outline-variant/20 last:border-0">
                <p className="text-sm font-medium">{item.action}</p>
                <p className="text-xs text-on-surface-variant">
                  {item.patient} · {item.time}
                </p>
              </div>
            ))}
          </GlassCard>
        </div>
      </div>
    </PageContainer>
  );
}
