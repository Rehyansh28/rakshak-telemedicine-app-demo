import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, ClipboardList, Wifi, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/useApp';
import { PATHS } from '../routes/paths';
import BrandLogo from '../components/brand/BrandLogo';
import IITJodhpurBadge from '../components/brand/IITJodhpurBadge';
import { BRAND } from '../data/brand';

const roles = [
  {
    id: 'doctor',
    title: 'Doctor View',
    subtitle: 'Consultation Access',
    description: 'Live video consultations, AR diagnostics, AI insights & emergency triage',
    icon: Stethoscope,
    path: PATHS.doctor.login,
    accent: 'border-primary',
  },
  {
    id: 'staff',
    title: 'Medical Staff View',
    subtitle: 'Patient Management',
    description: 'Register soldiers, prepare sensors & camera, and connect patients to doctors',
    icon: ClipboardList,
    path: PATHS.staff.login,
    accent: 'border-secondary',
  },
];

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { setRole, secureNode } = useApp();

  const selectRole = (role) => {
    setRole(role.id);
    navigate(role.path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface grid-bg relative overflow-hidden">
      <div className="scan-line fixed inset-0 pointer-events-none opacity-30" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary-container/10 rounded-full blur-[120px]" />

      <header className="relative z-10 w-full px-4 md:px-16 h-20 flex items-center justify-between max-w-[1600px] mx-auto">
        <BrandLogo to={PATHS.home} size="md" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-secondary">
            <Wifi className="w-4 h-4" />
            <span className="label-caps text-[10px] hidden sm:inline">STRAT-LINK ACTIVE</span>
          </div>
          <span className="label-caps text-[10px] text-on-surface-variant">NODE {secureNode}</span>
          <Link
            to={PATHS.home}
            className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary label-caps"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-16 py-12 max-w-[1600px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="font-sora text-3xl md:text-4xl font-bold text-primary mb-3">
            Select Access View
          </h2>
          <p className="text-on-surface-variant max-w-lg mx-auto">
            Medical personnel only. Soldiers are registered and assisted by staff — no direct soldier
            login to this portal.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full mb-12">
          {roles.map((role, i) => (
            <motion.button
              key={role.id}
              type="button"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ y: -8 }}
              onClick={() => selectRole(role)}
              className={`glass-card rounded-2xl p-8 text-left border-2 ${role.accent} hover:border-secondary-container transition-all`}
            >
              <div className="w-14 h-14 bg-primary-container rounded-xl flex items-center justify-center mb-6">
                <role.icon className="w-7 h-7 text-secondary-container" />
              </div>
              <p className="label-caps text-secondary mb-1">{role.subtitle}</p>
              <h3 className="font-sora text-2xl font-bold text-primary mb-3">{role.title}</h3>
              <p className="text-on-surface-variant text-sm">{role.description}</p>
              <span className="inline-block mt-6 label-caps text-primary">Enter →</span>
            </motion.button>
          ))}
        </div>

        <IITJodhpurBadge size="lg" className="opacity-90" />
      </main>
    </div>
  );
}
