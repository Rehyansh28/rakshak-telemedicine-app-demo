import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Bell, Shield, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { doctorProfile, emergencyAlerts } from '../../data/mockData';
import { formatLiveTime } from '../../utils/formatTime';
import { PATHS } from '../../routes/paths';
import SlideOver from '../ui/SlideOver';

export default function TopNavbar({
  sidebarWidth = 256,
  onMenuClick,
  onShieldClick,
}) {
  const {
    liveTimestamp,
    selectedPatient,
    notificationsOpen,
    setNotificationsOpen,
    setSelectedPatient,
    patientList,
    showToast,
  } = useApp();
  const navigate = useNavigate();

  const handleAlertClick = (alert) => {
    const patient = patientList.find((p) => p.id === alert.soldierId);
    if (patient) setSelectedPatient(patient);
    setNotificationsOpen(false);
    navigate(PATHS.doctor.consultation);
    showToast(`Opened consultation: ${alert.patient}`, 'info');
  };

  return (
    <>
      <motion.header
        initial={false}
        animate={{ left: sidebarWidth }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="fixed top-0 right-0 z-50 flex justify-between items-center px-4 md:px-8 lg:px-12 h-16 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 max-md:!left-0"
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
          <div className="hidden md:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/50 w-72 lg:w-96 flex-1 max-w-xl">
            <Search className="w-4 h-4 text-outline mr-2 shrink-0" />
            <input
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-outline-variant outline-none"
              placeholder="Search Soldier ID, Rank, or Regiment..."
              type="text"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  showToast(`Search: ${e.target.value || 'all units'}`, 'info');
                }
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {selectedPatient && (
            <span className="hidden xl:inline label-caps text-[10px] text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full truncate max-w-[140px]">
              {selectedPatient.id}
            </span>
          )}
          <span className="hidden lg:block font-mono text-xs text-on-surface-variant">
            {formatLiveTime(liveTimestamp)} IST
          </span>
          <span className="hidden sm:flex items-center gap-1 px-2 py-1 bg-primary text-on-primary rounded-full text-[10px] label-caps">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
            SECURE
          </span>
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="p-2 text-on-surface-variant hover:text-secondary relative rounded-lg hover:bg-surface-container-low"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
          </button>
          <button
            type="button"
            onClick={onShieldClick}
            className="p-2 text-on-surface-variant hover:text-secondary rounded-lg hover:bg-surface-container-low"
            aria-label="Security status"
          >
            <Shield className="w-5 h-5" />
          </button>
          <div className="h-8 w-8 rounded-full bg-primary-container overflow-hidden border border-secondary/30">
            <img src={doctorProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </motion.header>

      <SlideOver open={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="Emergency Alerts">
        <div className="space-y-3">
          {emergencyAlerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => handleAlertClick(alert)}
              className="w-full text-left p-4 rounded-xl glass-card hover:ring-2 hover:ring-secondary/30 transition-all"
            >
              <div className="flex justify-between gap-2 mb-1">
                <span className={`label-caps text-[10px] ${alert.type === 'critical' ? 'text-error' : 'text-secondary'}`}>
                  {alert.type}
                </span>
                <span className="text-[10px] text-on-surface-variant">{alert.time}</span>
              </div>
              <p className="font-semibold text-sm text-primary">{alert.title}</p>
              <p className="text-xs text-on-surface-variant mt-1">{alert.message}</p>
              <p className="font-mono text-xs text-secondary mt-2">{alert.soldierId}</p>
            </button>
          ))}
        </div>
      </SlideOver>
    </>
  );
}
