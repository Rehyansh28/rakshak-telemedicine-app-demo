import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Fingerprint } from 'lucide-react';
import { useApp } from '../context/appContext';
import { PATHS } from '../routes/paths';
import Button from '../components/ui/Button';
import BrandLogo from '../components/brand/BrandLogo';
import IITJodhpurBadge from '../components/brand/IITJodhpurBadge';
import { apiPost, setToken } from '../api/client';

export default function DoctorLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsAuthenticated, setDoctor, secureNode, showToast } = useApp();
  const [credentials, setCredentials] = useState({ id: '', pass: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || PATHS.doctor.dashboard;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost('/auth/login/', {
        username: credentials.id,
        password: credentials.pass,
      });
      setToken(data.token);
      setDoctor(data.doctor);
      setIsAuthenticated(true);
      showToast('Secure uplink established', 'success');
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
          <p className="label-caps text-[10px] text-on-surface-variant mt-3">Officer Login · Node {secureNode}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <p className="text-sm text-error bg-error-container/30 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="label-caps text-on-surface-variant block mb-2">Officer ID</label>
            <input
              type="text"
              value={credentials.id}
              onChange={(e) => setCredentials({ ...credentials, id: e.target.value })}
              placeholder="doctor"
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

          <Button type="submit" className="w-full" disabled={loading} icon={loading ? undefined : Fingerprint}>
            {loading ? 'Authenticating...' : 'Secure Login'}
          </Button>

          <p className="text-center text-xs text-on-surface-variant flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            Demo: doctor / rakshak2026
          </p>
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
