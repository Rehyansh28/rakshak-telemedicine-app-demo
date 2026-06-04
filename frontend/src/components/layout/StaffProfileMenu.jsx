import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Heart,
  Shield,
  HelpCircle,
  LogOut,
  RefreshCw,
  ChevronDown,
  ClipboardList,
} from 'lucide-react';
import { PATHS } from '../../routes/paths';
import { useApp } from '../../context/useApp';
import { BRAND } from '../../data/brand';

export default function StaffProfileMenu() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const {
    profileOpen,
    setProfileOpen,
    selectedPatient,
    showToast,
    secureNode,
    setRole,
    setSensorProgress,
    staffLogout,
  } = useApp();

  const soldier = selectedPatient;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setProfileOpen(false);
    };
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen, setProfileOpen]);

  const close = () => setProfileOpen(false);

  const handleLogout = () => {
    close();
    staffLogout();
    setRole(null);
    showToast('Staff session ended', 'success');
    navigate(PATHS.roleSelection);
  };

  const items = [
    {
      icon: ClipboardList,
      label: 'Change Soldier',
      onClick: () => {
        close();
        setSensorProgress(0);
        navigate(PATHS.staff.patients);
      },
    },
    ...(soldier?.id
      ? [
          {
            icon: User,
            label: 'Active Soldier',
            onClick: () => {
              close();
              showToast(`${soldier.name} · ${soldier.id}`, 'info');
            },
          },
          {
            icon: Heart,
            label: 'Live Vitals',
            onClick: () => {
              close();
              navigate(PATHS.staff.waitingRoom);
            },
          },
        ]
      : []),
    {
      icon: Shield,
      label: 'Connection Security',
      onClick: () => {
        close();
        showToast('STRAT-LINK AES-256 verified', 'info');
      },
    },
    {
      icon: HelpCircle,
      label: 'Staff Support',
      onClick: () => {
        close();
        showToast(`Helpdesk: ${BRAND.supportHotline}`, 'info');
      },
    },
    {
      icon: RefreshCw,
      label: 'Change View',
      onClick: () => {
        close();
        setRole(null);
        navigate(PATHS.roleSelection);
      },
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setProfileOpen(!profileOpen)}
        className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all ${
          profileOpen
            ? 'border-secondary bg-white ring-2 ring-secondary/30'
            : 'border-outline-variant/50 bg-white hover:border-secondary'
        }`}
      >
        <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
          <ClipboardList className="w-4 h-4 text-secondary-container" />
        </div>
        <span className="hidden md:block text-xs font-medium text-primary max-w-[120px] truncate">
          {soldier?.name ? soldier.name.split(' ')[0] : 'Staff'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${profileOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {profileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 top-full mt-2 w-60 rounded-xl shadow-2xl border border-outline-variant/40 bg-white z-[60] overflow-hidden"
          >
            <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low">
              <p className="label-caps text-[10px] text-secondary">Medical Staff</p>
              {soldier?.id ? (
                <>
                  <p className="font-sora font-semibold text-sm text-primary mt-1">{soldier.name}</p>
                  <p className="font-mono text-[10px] text-secondary">{soldier.id}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{soldier.regiment}</p>
                </>
              ) : (
                <p className="text-xs text-on-surface-variant mt-1">No soldier selected</p>
              )}
              <p className="font-mono text-[10px] text-on-surface-variant mt-1">NODE {secureNode}</p>
            </div>
            <div className="py-1">
              {items.map(({ icon: Icon, label, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-container-low text-left"
                >
                  <Icon className="w-4 h-4 text-on-surface-variant shrink-0" />
                  {label}
                </button>
              ))}
            </div>
            <div className="border-t border-outline-variant/30 p-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error-container/30 text-left"
              >
                <LogOut className="w-4 h-4" />
                Exit Session
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
