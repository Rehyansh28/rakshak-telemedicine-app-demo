import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import PatientCard from '../components/patient/PatientCard';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/appContext';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'stable', label: 'Stable' },
];

const SORTS = [
  { id: 'priority', label: 'Priority' },
  { id: 'name', label: 'Name' },
  { id: 'altitude', label: 'Altitude' },
];

const priorityOrder = { critical: 0, consultation: 1, monitoring: 2, stable: 3 };

export default function ActivePatientsPage() {
  const navigate = useNavigate();
  const {
    patientList,
    selectedPatient,
    setSelectedPatient,
    patientFilter,
    setPatientFilter,
    patientSort,
    setPatientSort,
  } = useApp();

  const filtered = useMemo(() => {
    let list = [...patientList];
    if (patientFilter !== 'all') {
      list = list.filter((p) =>
        patientFilter === 'critical'
          ? p.status === 'critical' || p.status === 'consultation'
          : p.status === 'stable' || p.status === 'monitoring'
      );
    }
    list.sort((a, b) => {
      if (patientSort === 'name') return a.name.localeCompare(b.name);
      if (patientSort === 'altitude') return b.altitude - a.altitude;
      return (priorityOrder[a.status] ?? 9) - (priorityOrder[b.status] ?? 9);
    });
    return list;
  }, [patientList, patientFilter, patientSort]);

  const handleSelect = (patient) => {
    setSelectedPatient(patient);
    navigate(PATHS.doctor.consultation);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Tactical Patient Registry"
        title="Active Patients"
        description={`${patientList.length} soldiers under monitoring`}
        breadcrumbs={[
          { label: 'Command Center', to: PATHS.doctor.dashboard },
          { label: 'Active Patients' },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-on-surface-variant" />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setPatientFilter(f.id)}
              className={`label-caps text-[10px] px-3 py-1.5 rounded-full border transition-colors ${
                patientFilter === f.id
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-secondary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={patientSort}
          onChange={(e) => setPatientSort(e.target.value)}
          className="ml-auto label-caps text-[10px] px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest outline-none focus:border-secondary"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="font-sora text-lg text-primary mb-2">No patients match this filter</p>
          <button
            type="button"
            onClick={() => setPatientFilter('all')}
            className="label-caps text-secondary hover:underline"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filtered.map((patient, i) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <PatientCard
                patient={patient}
                selected={selectedPatient?.id === patient.id}
                onClick={() => handleSelect(patient)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </PageContainer>
  );
}
