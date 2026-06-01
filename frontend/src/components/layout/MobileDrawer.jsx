import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Radio,
  Network,
  Brain,
  FileText,
  Key,
  Truck,
  AlertTriangle,
  Settings,
  HelpCircle,
  X,
} from 'lucide-react';
import { PATHS } from '../../routes/paths';
import { useApp } from '../../context/useApp';
import { BRAND } from '../../data/brand';
const navItems = [
  { to: PATHS.doctor.dashboard, icon: LayoutDashboard, label: 'Command Center' },
  { to: PATHS.doctor.patients, icon: Users, label: 'Active Patients' },
  { to: PATHS.doctor.consultation, icon: Radio, label: 'Live Consultation' },
  { to: PATHS.doctor.arDiagnostic, icon: Network, label: 'AR Diagnostic' },
  { to: PATHS.doctor.aiInsights, icon: Brain, label: 'AI Insights' },
  { to: PATHS.doctor.report, icon: FileText, label: 'Clinical Report' },
];

export default function MobileDrawer({ open, onClose, onPlaceholder, onSOS, onSettings }) {
  const { secureNode } = useApp();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-primary/50 md:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-[91] w-72 bg-primary flex flex-col md:hidden shadow-2xl"
          >
            <div className="p-6 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-3">
                <img src={BRAND.logo} alt={BRAND.name} className="w-9 h-9 object-contain" />
                <div>
                  <h2 className="font-sora font-semibold text-on-primary text-sm">{BRAND.nameUpper}</h2>
                  <p className="label-caps text-[10px] text-secondary-fixed-dim/70">Node {secureNode}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="text-on-primary p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg label-caps text-xs ${
                      isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-[#abc7ff] hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => { onClose(); onPlaceholder('Encryption Keys'); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg label-caps text-xs text-[#abc7ff] hover:text-white"
              >
                <Key className="w-5 h-5" />
                Encryption Keys
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onPlaceholder('Medical Logistics'); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg label-caps text-xs text-[#abc7ff] hover:text-white"
              >
                <Truck className="w-5 h-5" />
                Medical Logistics
              </button>
            </nav>
            <div className="p-4 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => { onClose(); onSOS(); }}
                className="w-full bg-error text-white label-caps py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Emergency SOS
              </button>
              <button type="button" onClick={() => { onClose(); onSettings(); }} className="w-full text-[#abc7ff] px-4 py-2 flex items-center gap-3 label-caps text-xs">
                <Settings className="w-5 h-5" /> Settings
              </button>
              <button type="button" onClick={() => { onClose(); onSettings(true); }} className="w-full text-[#abc7ff] px-4 py-2 flex items-center gap-3 label-caps text-xs">
                <HelpCircle className="w-5 h-5" /> Support
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
