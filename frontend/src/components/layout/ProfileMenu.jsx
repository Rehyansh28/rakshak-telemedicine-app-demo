import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { PATHS } from '../../routes/paths';
import { useApp } from '../../context/useApp';

export default function ProfileMenu({ onSettings, onSupport, onShieldClick }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const {
    profileOpen,
    setProfileOpen,
    logout,
    showToast,
    secureNode,
    doctor,
  } = useApp();

  const doctorProfile = doctor || {
    name: 'Officer',
    rank: '',
    unit: '',
    avatar: '',
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen, setProfileOpen]);

  const close = () => setProfileOpen(false);

  const handleLogout = () => {
    close();
    logout();
    showToast('Session ended — logged out securely', 'success');
    navigate(PATHS.doctor.login);
  };

  const items = [
    {
      icon: User,
      label: 'My Profile',
      onClick: () => {
        close();
        showToast(`Profile: ${doctorProfile.name}`, 'info');
      },
    },
    {
      icon: FileText,
      label: 'Clinical Reports',
      onClick: () => {
        close();
        navigate(PATHS.doctor.report);
      },
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        close();
        onSettings?.(false);
      },
    },
    {
      icon: Shield,
      label: 'Security Status',
      onClick: () => {
        close();
        onShieldClick?.();
      },
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onClick: () => {
        close();
        onSupport?.(true);
      },
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setProfileOpen(!profileOpen)}
        aria-expanded={profileOpen}
        aria-haspopup="true"
        className={`flex items-center gap-2 p-1 pr-2 rounded-full border transition-all ${
          profileOpen
            ? 'border-secondary bg-secondary-container/15 ring-2 ring-secondary/30'
            : 'border-secondary/30 hover:border-secondary hover:bg-surface-container-low'
        }`}
      >
        <div className="h-8 w-8 rounded-full bg-primary-container overflow-hidden border border-secondary/30 shrink-0">
          {doctorProfile.avatar ? (
            <img src={doctorProfile.avatar} alt={doctorProfile.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold">
              {doctorProfile.name.charAt(0)}
            </div>
          )}
        </div>
        <span className="hidden lg:block text-sm font-medium text-primary max-w-[120px] truncate">
          {doctorProfile.name.split(' ').slice(-2).join(' ')}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-on-surface-variant hidden lg:block transition-transform ${
            profileOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {profileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-2xl border border-outline-variant/40 overflow-hidden z-[60] bg-white"
          >
            <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low">
              <div className="flex items-center gap-3">
                {doctorProfile.avatar ? (
                  <img
                    src={doctorProfile.avatar}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover border border-secondary/30"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold">
                    {doctorProfile.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-sora font-semibold text-sm text-primary truncate">{doctorProfile.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {doctorProfile.rank}
                    {doctorProfile.unit ? ` · ${doctorProfile.unit}` : ''}
                  </p>
                  <p className="font-mono text-[10px] text-secondary mt-0.5">NODE {secureNode}</p>
                </div>
              </div>
            </div>

            <div className="py-1 bg-white">
              {items.map(({ icon: Icon, label, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"
                >
                  <Icon className="w-4 h-4 text-on-surface-variant shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            <div className="border-t border-outline-variant/30 p-1 bg-white">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error-container/40 rounded-lg transition-colors text-left"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
