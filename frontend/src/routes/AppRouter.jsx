import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DoctorLayout from '../components/layout/DoctorLayout';
import PatientLayout from '../components/layout/PatientLayout';
import SplashPage from '../pages/SplashPage';
import RoleSelectionPage from '../pages/RoleSelectionPage';
import DoctorLoginPage from '../pages/DoctorLoginPage';
import DoctorDashboardPage from '../pages/DoctorDashboardPage';
import ActivePatientsPage from '../pages/ActivePatientsPage';
import LiveConsultationPage from '../pages/LiveConsultationPage';
import ARDiagnosticPage from '../pages/ARDiagnosticPage';
import OrganDetailPage from '../pages/OrganDetailPage';
import AIInsightsPage from '../pages/AIInsightsPage';
import MedicalReportPage from '../pages/MedicalReportPage';
import SensorConnectionPage from '../pages/SensorConnectionPage';
import CameraAlignmentPage from '../pages/CameraAlignmentPage';
import WaitingRoomPage from '../pages/WaitingRoomPage';
import { PATHS } from './paths';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={PATHS.home} element={<SplashPage />} />
        <Route path={PATHS.roleSelection} element={<RoleSelectionPage />} />
        <Route path={PATHS.doctor.login} element={<DoctorLoginPage />} />

        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboardPage />} />
          <Route path="patients" element={<ActivePatientsPage />} />
          <Route path="consultation" element={<LiveConsultationPage />} />
          <Route path="ar-diagnostic" element={<ARDiagnosticPage />} />
          <Route path="organ/:organId" element={<OrganDetailPage />} />
          <Route path="ai-insights" element={<AIInsightsPage />} />
          <Route path="report" element={<MedicalReportPage />} />
        </Route>

        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<Navigate to="sensors" replace />} />
          <Route path="sensors" element={<SensorConnectionPage />} />
          <Route path="camera" element={<CameraAlignmentPage />} />
          <Route path="waiting-room" element={<WaitingRoomPage />} />
        </Route>

        <Route path="*" element={<Navigate to={PATHS.home} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
