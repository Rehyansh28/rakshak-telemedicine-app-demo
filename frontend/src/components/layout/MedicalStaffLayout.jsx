import { Outlet, useLocation, Navigate } from 'react-router-dom';
import StaffSidebar from './StaffSidebar';
import StaffTopNavbar from './StaffTopNavbar';
import StaffMobileDrawer from './StaffMobileDrawer';
import ToastContainer from '../ui/Toast';
import { PATHS } from '../../routes/paths';
import { useApp } from '../../context/useApp';
import PageContainer from './PageContainer';

const SESSION_PATHS = [PATHS.staff.sensors, PATHS.staff.camera, PATHS.staff.waitingRoom];

export default function MedicalStaffLayout() {
  const location = useLocation();
  const { mobileNavOpen, setMobileNavOpen, sidebarCollapsed, selectedPatient } = useApp();
  const sidebarWidth = sidebarCollapsed ? 72 : 256;

  const needsPatient =
    SESSION_PATHS.includes(location.pathname) && !selectedPatient?.id;

  if (needsPatient) {
    return <Navigate to={PATHS.staff.patients} replace />;
  }

  return (
    <div className="min-h-screen bg-background hud-grid">
      <StaffSidebar />
      <StaffTopNavbar
        sidebarWidth={sidebarWidth}
        onMenuClick={() => setMobileNavOpen(true)}
      />
      <StaffMobileDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main
        className={`pt-16 min-h-screen transition-[margin-left] duration-250 ease-in-out max-md:ml-0 ${
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-64'
        }`}
      >
        <PageContainer>
          <Outlet />
        </PageContainer>
      </main>

      <ToastContainer />
    </div>
  );
}
