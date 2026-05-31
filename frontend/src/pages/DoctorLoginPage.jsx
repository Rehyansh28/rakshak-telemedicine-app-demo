import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Fingerprint } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PATHS } from '../routes/paths';
import Button from '../components/ui/Button';
import BrandLogo from '../components/brand/BrandLogo';
import IITJodhpurBadge from '../components/brand/IITJodhpurBadge';

export default function DoctorLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsAuthenticated, secureNode } = useApp();
  const [credentials, setCredentials] = useState({ id: '', pass: '' });
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || PATHS.doctor.dashboard;

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      setLoading(false);
      navigate(from, { replace: true });
    }, 1200);
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
          <div>
            <label className="label-caps text-on-surface-variant block mb-2">Officer ID</label>
            <input
              type="text"
              value={credentials.id}
              onChange={(e) => setCredentials({ ...credentials, id: e.target.value })}
              placeholder="AMC-2847-JOD"
              className="w-full bg-transparent border-b-2 border-outline-variant focus:border-secondary-container py-3 font-mono text-sm outline-none transition-colors"
            />
          </div>
          <div>
            <label className="label-caps text-on-surface-variant block mb-2">Access Code</label>
            <input
              type="password"
              value={credentials.pass}
              onChange={(e) => setCredentials({ ...credentials, pass: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-transparent border-b-2 border-outline-variant focus:border-secondary-container py-3 font-mono text-sm outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Lock className="w-4 h-4 text-secondary" />
            <span>AES-256 encrypted · STRAT-LINK verified</span>
          </div>

          <Button type="submit" loading={loading} className="w-full" icon={loading ? Fingerprint : undefined}>
            Authenticate & Enter
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-on-surface-variant">
          <Link to={PATHS.roleSelection} className="text-secondary hover:underline">
            ← Change role
          </Link>
        </p>
        <p className="text-center mt-2 text-xs text-on-surface-variant/70">Demo: any credentials accepted</p>
      </motion.div>

      <div className="relative z-10 mt-10">
        <IITJodhpurBadge />
      </div>
    </div>
  );
}
