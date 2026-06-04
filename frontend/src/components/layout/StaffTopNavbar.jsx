import { motion } from 'framer-motion';
import { Menu, Bell, Shield } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { formatLiveTime } from '../../utils/formatTime';
import StaffProfileMenu from './StaffProfileMenu';

export default function StaffTopNavbar({ sidebarWidth = 256, onMenuClick }) {
  const { liveTimestamp, selectedPatient, showToast } = useApp();

  return (
    <motion.header
      initial={false}
      animate={{ left: sidebarWidth }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed top-0 right-0 z-50 flex justify-between items-center px-4 md:px-8 h-16 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 max-md:!left-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 text-primary md:hidden rounded-lg hover:bg-surface-container-low"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <p className="label-caps text-[10px] text-secondary">Medical Staff Portal</p>
          <p className="font-mono text-xs text-on-surface-variant">{formatLiveTime(liveTimestamp)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {selectedPatient && (
          <span className="hidden sm:inline label-caps text-[10px] text-on-primary bg-primary px-3 py-1 rounded-full truncate max-w-[160px]">
            {selectedPatient.name}
          </span>
        )}
        <button
          type="button"
          onClick={() => showToast('No new alerts', 'info')}
          className="p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant"
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
        <StaffProfileMenu />
      </div>
    </motion.header>
  );
}
