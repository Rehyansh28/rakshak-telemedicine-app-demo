import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import { useApp } from '../context/useApp';
import { PATHS } from '../routes/paths';
import Button from '../components/ui/Button';
import BrandLogo from '../components/brand/BrandLogo';
import IITJodhpurBadge from '../components/brand/IITJodhpurBadge';
import { staffApiPost, setStaffToken, setStoredStaff } from '../api/client';

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsStaffAuthenticated, setStaff, secureNode, showToast } = useApp();
  const [credentials, setCredentials] = useState({ id: '', pass: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || PATHS.staff.dashboard;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await staffApiPost('/auth/staff/login/', {
        username: credentials.id,
        password: credentials.pass,
      });
      setStaffToken(data.token);
      setStoredStaff(data.staff);
      setStaff(data.staff);
      setIsStaffAuthenticated(true);
      showToast('Medical staff session established', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hud-grid flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-container/5 to-secondary-container/10" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md glass-card rounded-2xl p-8 shadow-xl"
      >
        <div className="flex flex-col items-center mb-8">
          <BrandLogo size="lg" showText className="flex-col text-center gap-2" />
          <p className="label-caps text-[10px] text-on-surface-variant mt-3">
            Medical Staff Login · Node {secureNode}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <p className="text-sm text-error bg-error-container/30 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="label-caps text-on-surface-variant block mb-2">Username or email</label>
            <input
              type="text"
              value={credentials.id}
              onChange={(e) => setCredentials({ ...credentials, id: e.target.value })}
              placeholder="username or email"
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/40"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label-caps text-on-surface-variant block mb-2">Passphrase</label>
            <input
              type="password"
              value={credentials.pass}
              onChange={(e) => setCredentials({ ...credentials, pass: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/40"
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading} icon={loading ? undefined : ClipboardList}>
            {loading ? 'Authenticating...' : 'Staff Secure Login'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-outline-variant/30">
          <IITJodhpurBadge size="sm" className="justify-center" />
          <p className="text-center mt-4">
            <Link to={PATHS.roleSelection} className="text-xs text-secondary hover:underline">
              ← Back to role selection
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
