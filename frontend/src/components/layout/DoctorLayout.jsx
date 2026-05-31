import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import MobileDrawer from './MobileDrawer';
import DoctorRouteGuard from './DoctorRouteGuard';
import Modal from '../ui/Modal';
import ToastContainer from '../ui/Toast';
import Button from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { PATHS } from '../../routes/paths';
import { patients } from '../../data/mockData';
import { BRAND } from '../../data/brand';
import IITJodhpurBadge from '../brand/IITJodhpurBadge';

export default function DoctorLayout() {
  const navigate = useNavigate();
  const {
    mobileNavOpen,
    setMobileNavOpen,
    setSelectedPatient,
    showToast,
    secureNode,
    sidebarCollapsed,
  } = useApp();

  const [placeholderModal, setPlaceholderModal] = useState(null);
  const [sosModal, setSosModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(null);
  const [shieldModal, setShieldModal] = useState(false);

  const sidebarWidth = sidebarCollapsed ? 72 : 256;

  const onPlaceholder = (name) => setPlaceholderModal(name);
  const onSettings = (isSupport = false) => setSettingsModal(isSupport ? 'support' : 'settings');

  const confirmSOS = () => {
    const critical = patients.find((p) => p.status === 'critical') || patients[0];
    setSelectedPatient(critical);
    setSosModal(false);
    setMobileNavOpen(false);
    showToast(`Emergency SOS — connecting to ${critical.name}`, 'info');
    navigate(PATHS.doctor.consultation);
  };

  return (
    <DoctorRouteGuard>
      <div className="min-h-screen bg-background hud-grid">
        <Sidebar onPlaceholder={onPlaceholder} onSOS={() => setSosModal(true)} onSettings={onSettings} />
        <TopNavbar
          sidebarWidth={sidebarWidth}
          onMenuClick={() => setMobileNavOpen(true)}
          onShieldClick={() => setShieldModal(true)}
        />
        <MobileDrawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          onPlaceholder={onPlaceholder}
          onSOS={() => setSosModal(true)}
          onSettings={onSettings}
        />

        <main
          className={`pt-16 min-h-screen transition-[margin-left] duration-250 ease-in-out max-md:ml-0 ${
            sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-64'
          }`}
        >
          <Outlet />
        </main>

        <ToastContainer />

        <Modal open={!!placeholderModal} onClose={() => setPlaceholderModal(null)} title={placeholderModal}>
          <p className="text-sm text-on-surface-variant mb-6">
            The <strong>{placeholderModal}</strong> module is scheduled for the next deployment phase. All tactical
            medical workflows remain available via the command center.
          </p>
          <Button variant="primary" onClick={() => setPlaceholderModal(null)} className="w-full">
            Acknowledged
          </Button>
        </Modal>

        <Modal open={sosModal} onClose={() => setSosModal(false)} title="Emergency SOS" size="sm">
          <p className="text-sm text-on-surface-variant mb-6">
            Initiate priority uplink to the nearest critical patient and open live consultation?
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setSosModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmSOS} className="flex-1">
              Confirm SOS
            </Button>
          </div>
        </Modal>

        <Modal
          open={!!settingsModal}
          onClose={() => setSettingsModal(null)}
          title={settingsModal === 'support' ? 'Tactical Support' : 'System Settings'}
        >
          {settingsModal === 'support' ? (
            <div className="space-y-4 text-sm text-on-surface-variant">
              <IITJodhpurBadge size="lg" />
              <p>
                24/7 Field Hotline: <span className="font-mono text-secondary">{BRAND.supportHotline}</span>
              </p>
              <p>
                {BRAND.name} Helpdesk: <span className="font-mono">{BRAND.supportEmail}</span>
              </p>
              <p className="label-caps text-[10px] pt-2">Version 1.0.0-prototype</p>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <label className="flex items-center justify-between">
                <span>HUD Grid Overlay</span>
                <input type="checkbox" defaultChecked className="accent-secondary" />
              </label>
              <label className="flex items-center justify-between">
                <span>Live Vitals Sync</span>
                <input type="checkbox" defaultChecked className="accent-secondary" />
              </label>
              <label className="flex items-center justify-between">
                <span>AI Alert Sounds</span>
                <input type="checkbox" defaultChecked className="accent-secondary" />
              </label>
            </div>
          )}
          <Button variant="primary" onClick={() => setSettingsModal(null)} className="w-full mt-6">
            Close
          </Button>
        </Modal>

        <Modal open={shieldModal} onClose={() => setShieldModal(false)} title="Security Status">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">Encryption</span>
              <span className="font-mono text-[#16a34a] font-bold">AES-256 ACTIVE</span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">STRAT-LINK</span>
              <span className="font-mono text-secondary font-bold">VERIFIED</span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">Secure Node</span>
              <span className="font-mono text-primary font-bold">{secureNode}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-on-surface-variant">Biometric Tunnel</span>
              <span className="font-mono text-[#16a34a] font-bold">SECURE</span>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setShieldModal(false)} className="w-full mt-6">
            Dismiss
          </Button>
        </Modal>
      </div>
    </DoctorRouteGuard>
  );
}
