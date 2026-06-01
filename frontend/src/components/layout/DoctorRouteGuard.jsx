import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import { PATHS } from '../../routes/paths';

export default function DoctorRouteGuard({ children }) {
  const { isAuthenticated } = useApp();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={PATHS.doctor.login} state={{ from: location }} replace />;
  }

  return children;
}
