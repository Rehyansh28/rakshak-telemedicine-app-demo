import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LogOut,
  Check,
  Shield,
  Signal,
  HelpCircle,
  Bell,
} from 'lucide-react';
import { PATHS } from '../../routes/paths';
import { useApp } from '../../context/useApp';
import ToastContainer from '../ui/Toast';
import BrandLogo from '../brand/BrandLogo';
import PatientProfileMenu from './PatientProfileMenu';
import { BRAND } from '../../data/brand';
import IITJodhpurBadge from '../brand/IITJodhpurBadge';

const STEPS = [
  { path: PATHS.patient.sensors, label: 'Sensor Connection', short: '1' },
  { path: PATHS.patient.camera, label: 'Camera Alignment', short: '2' },
  { path: PATHS.patient.waitingRoom, label: 'Waiting Room', short: '3' },
];

export default function PatientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { secureNode, showToast } = useApp();
  const currentIndex = STEPS.findIndex((s) => location.pathname === s.path);

  return (
    <div className="min-h-screen bg-background hud-grid">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <BrandLogo to={PATHS.home} size="sm" />

          <div className="hidden md:flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-[10px] label-caps text-on-surface-variant">
              <Signal className="w-3.5 h-3.5 text-secondary" />
              SAT-NODE
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-on-primary text-[10px] label-caps">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse" />
              SECURE
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant">NODE {secureNode}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => showToast('No new alerts', 'info')}
              className="p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => showToast('STRAT-LINK · AES-256 active', 'info')}
              className="p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant"
              aria-label="Security"
            >
              <Shield className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => showToast(`Support: ${BRAND.supportHotline}`, 'info')}
              className="hidden sm:block p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant"
              aria-label="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <PatientProfileMenu />
            <button
              type="button"
              onClick={() => navigate(PATHS.roleSelection)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant/50 text-on-surface-variant hover:text-primary hover:border-primary text-xs label-caps"
            >
              <LogOut className="w-4 h-4" />
              Exit
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 pb-5">
          <div className="flex items-center">
            {STEPS.map((step, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              const reachable = i <= currentIndex;
              return (
                <div key={step.path} className="flex items-center flex-1 min-w-0">
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => reachable && navigate(step.path)}
                    className={`flex items-center gap-2 min-w-0 ${reachable ? 'cursor-pointer' : 'cursor-default opacity-40'}`}
                  >
                    <div
                      className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        active
                          ? 'border-secondary-container bg-secondary-container text-primary shadow-md shadow-secondary/20'
                          : done
                            ? 'border-[#16a34a] bg-[#16a34a] text-white'
                            : 'border-outline-variant bg-white text-on-surface-variant'
                      }`}
                    >
                      {done ? <Check className="w-4 h-4" /> : step.short}
                    </div>
                    <span
                      className={`label-caps text-[10px] truncate hidden sm:block ${
                        active ? 'text-secondary' : done ? 'text-[#16a34a]' : 'text-on-surface-variant'
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 sm:mx-4 min-w-[12px] ${
                        i < currentIndex ? 'bg-[#16a34a]' : 'bg-outline-variant/40'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-6xl mx-auto px-4 md:px-8 py-8"
      >
        <Outlet />
      </motion.main>

      <footer className="max-w-6xl mx-auto px-4 md:px-8 py-6 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <IITJodhpurBadge size="sm" />
        <p className="text-[10px] label-caps text-on-surface-variant">{BRAND.name} · Field Interface v1.0</p>
      </footer>

      <ToastContainer />
    </div>
  );
}
