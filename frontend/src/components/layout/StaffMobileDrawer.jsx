import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Activity,
  Camera,
  Clock,
  LogOut,
  X,
} from 'lucide-react';
import { PATHS } from '../../routes/paths';
import { useApp } from '../../context/useApp';
import { BRAND } from '../../data/brand';

const mainNav = [
  { to: PATHS.staff.dashboard, icon: LayoutDashboard, label: 'Dashboard' },
  { to: PATHS.staff.patients, icon: Users, label: 'Soldiers' },
];

const sessionNav = [
  { to: PATHS.staff.sensors, icon: Activity, label: 'Sensors' },
  { to: PATHS.staff.camera, icon: Camera, label: 'Camera' },
  { to: PATHS.staff.waitingRoom, icon: Clock, label: 'Doctor Handoff' },
];

export default function StaffMobileDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const { secureNode, selectedPatient, showToast, staffLogout, setRole } = useApp();
  const hasPatient = !!selectedPatient?.id;

  const handleSessionClick = (e, to) => {
    if (!hasPatient) {
      e.preventDefault();
      showToast('Select a soldier from Soldiers first', 'info');
      return;
    }
    onClose();
  };

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
            className="fixed left-0 top-0 bottom-0 z-[91] w-72 bg-primary flex flex-col md:hidden shadow-2xl"
          >
            <div className="p-4 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-3">
                <img src={BRAND.logo} alt={BRAND.name} className="w-9 h-9 object-contain" />
                <div>
                  <h2 className="font-sora font-semibold text-on-primary text-sm">Staff Console</h2>
                  <p className="label-caps text-[10px] text-secondary/70">Node {secureNode}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="text-on-primary p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {mainNav.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg label-caps text-xs ${
                      isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-[#abc7ff]'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
              <p className="label-caps text-[9px] text-[#abc7ff]/60 px-4 pt-4">Connect to Doctor</p>
              {sessionNav.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={(e) => handleSessionClick(e, to)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg label-caps text-xs ${
                      !hasPatient ? 'opacity-40' : ''
                    } ${isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-[#abc7ff]'}`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  staffLogout();
                  setRole(null);
                  onClose();
                  navigate(PATHS.roleSelection);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 label-caps text-[#abc7ff]"
              >
                <LogOut className="w-5 h-5" />
                Exit
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
