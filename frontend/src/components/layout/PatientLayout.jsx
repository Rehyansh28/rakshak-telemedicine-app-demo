import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Check } from 'lucide-react';
import { PATHS } from '../../routes/paths';
import { useApp } from '../../context/AppContext';
import ToastContainer from '../ui/Toast';
import BrandLogo from '../brand/BrandLogo';

const STEPS = [
  { path: PATHS.patient.sensors, label: 'Sensors', short: '1' },
  { path: PATHS.patient.camera, label: 'Camera', short: '2' },
  { path: PATHS.patient.waitingRoom, label: 'Waiting Room', short: '3' },
];

export default function PatientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { secureNode } = useApp();
  const currentIndex = STEPS.findIndex((s) => location.pathname === s.path);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <BrandLogo size="sm" showText />
          <span className="label-caps text-[10px] text-on-surface-variant">NODE {secureNode}</span>
          <button
            type="button"
            onClick={() => navigate(PATHS.roleSelection)}
            className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline label-caps">Exit</span>
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 pb-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              const reachable = i <= currentIndex;
              return (
                <div key={step.path} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => reachable && navigate(step.path)}
                    className={`flex flex-col items-center gap-1 ${reachable ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                        active
                          ? 'border-secondary-container bg-secondary-container text-primary'
                          : done
                            ? 'border-success bg-success text-white'
                            : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      {done ? <Check className="w-4 h-4" /> : step.short}
                    </div>
                    <span
                      className={`label-caps text-[9px] hidden sm:block ${active ? 'text-secondary' : 'text-on-surface-variant'}`}
                    >
                      {step.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mb-4 sm:mb-5 ${i < currentIndex ? 'bg-success' : 'bg-outline-variant/40'}`}
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
        className="max-w-3xl mx-auto px-4 py-8"
      >
        <Outlet />
      </motion.main>
      <ToastContainer />
    </div>
  );
}
