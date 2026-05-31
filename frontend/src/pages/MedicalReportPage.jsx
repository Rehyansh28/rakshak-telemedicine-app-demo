import { Printer, Download, Shield, CheckCircle } from 'lucide-react';
import VitalsChart from '../components/charts/VitalsChart';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import { PATHS } from '../routes/paths';
import { medicalReport, aiInsights } from '../data/mockData';
import { formatDate } from '../utils/formatTime';
import { useApp } from '../context/AppContext';
import { BRAND } from '../data/brand';
import BrandLogo from '../components/brand/BrandLogo';
import IITJodhpurBadge from '../components/brand/IITJodhpurBadge';

export default function MedicalReportPage() {
  const { showToast } = useApp();
  const { patient, doctor, organs, timeline, notes, hash, reportId, diagnosis } = medicalReport;

  const handleDownload = () => {
    window.print();
    showToast('Report exported — PDF saved (demo)', 'success');
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Clinical Records"
        title="Medical Report"
        description={reportId}
        breadcrumbs={[
          { label: 'Command Center', to: PATHS.doctor.dashboard },
          { label: 'AI Insights', to: PATHS.doctor.aiInsights },
          { label: 'Report' },
        ]}
        actions={
          <div className="no-print flex gap-2">
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
            <Button icon={Download} onClick={handleDownload}>
              Download
            </Button>
          </div>
        }
        className="no-print"
      />

      <div className="bg-white border border-outline-variant/30 rounded-2xl p-8 md:p-12 shadow-lg print:shadow-none">
        <header className="border-b border-outline-variant/30 pb-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <BrandLogo size="md" showText={false} />
              <div>
                <h1 className="font-sora text-2xl font-bold text-primary">{BRAND.nameUpper}</h1>
                <p className="label-caps text-on-surface-variant mt-1">Clinical Medical Report</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold">{reportId}</p>
              <p className="text-xs text-on-surface-variant">{formatDate(new Date())}</p>
            </div>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="label-caps text-secondary mb-4">Patient Profile</h2>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-on-surface-variant">Name:</span> <strong>{patient.name}</strong></div>
            <div><span className="text-on-surface-variant">Soldier ID:</span> <strong className="font-mono">{patient.id}</strong></div>
            <div><span className="text-on-surface-variant">Rank:</span> {patient.rank}</div>
            <div><span className="text-on-surface-variant">Regiment:</span> {patient.regiment}</div>
            <div><span className="text-on-surface-variant">Location:</span> {patient.location}</div>
            <div><span className="text-on-surface-variant">Altitude:</span> {patient.altitude.toLocaleString()} ft</div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="label-caps text-secondary mb-4">Diagnosis</h2>
          <p className="text-lg font-semibold text-primary">{diagnosis}</p>
        </section>

        <section className="mb-8">
          <h2 className="label-caps text-secondary mb-4">Organ Summaries</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {organs.map((org) => (
              <div key={org.name} className="p-4 bg-surface-container-low rounded-lg">
                <p className="font-semibold">{org.name}</p>
                <p className="text-sm text-error">{org.status}</p>
                <p className="font-mono text-sm mt-1">{org.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="label-caps text-secondary mb-4">Vitals Chart</h2>
          <VitalsChart data={aiInsights.trends.heartRate} dataKey="v" color="#002d62" height={160} />
        </section>

        <section className="mb-8">
          <h2 className="label-caps text-secondary mb-4">Diagnostic Timeline</h2>
          <div className="space-y-3">
            {timeline.map((item, i) => (
              <div key={i} className="flex gap-4 text-sm">
                <span className="font-mono text-secondary w-14 shrink-0">{item.time}</span>
                <span>{item.event}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="label-caps text-secondary mb-4">Doctor Notes</h2>
          <p className="text-sm leading-relaxed bg-surface-container-low p-4 rounded-lg">{notes}</p>
          <p className="mt-4 text-sm">
            <strong>{doctor.name}</strong> · {doctor.rank} · {doctor.unit}
          </p>
        </section>

        <div className="mb-8 pt-6 border-t border-outline-variant/20">
          <IITJodhpurBadge size="sm" />
        </div>

        <footer className="border-t border-outline-variant/30 pt-6 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Shield className="w-4 h-4 text-secondary" />
            <span className="font-mono">{hash}</span>
          </div>
          <div className="flex items-center gap-2 text-[#16a34a] text-sm">
            <CheckCircle className="w-4 h-4" />
            <span className="label-caps text-[10px]">Verified & Signed</span>
          </div>
        </footer>
      </div>

      <div className="no-print mt-8">
        <Button to={PATHS.doctor.dashboard} variant="ghost">
          Back to Dashboard
        </Button>
      </div>
    </PageContainer>
  );
}
