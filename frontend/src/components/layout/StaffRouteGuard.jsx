import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import { PATHS } from '../../routes/paths';

export default function StaffRouteGuard({ children }) {
  const { isStaffAuthenticated } = useApp();
  const location = useLocation();

  if (!isStaffAuthenticated) {
    return <Navigate to={PATHS.staff.login} state={{ from: location }} replace />;
  }

  return children;
}
