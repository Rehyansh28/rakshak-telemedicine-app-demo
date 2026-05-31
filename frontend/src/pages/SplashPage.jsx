import { useNavigate } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Verified } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BrandLogo from '../components/brand/BrandLogo';
import PartnerFooter from '../components/brand/PartnerFooter';
import { BRAND } from '../data/brand';

export default function SplashPage() {
  const navigate = useNavigate();
  const { secureNode } = useApp();

  return (
    <div className="fixed inset-0 z-0 hud-grid overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-tr from-surface-container-highest/20 via-transparent to-secondary-container/10" />
      <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-secondary-container/5 blur-[120px]" />
      <div className="absolute top-[60%] -right-[10%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-[100px]" />

      <header className="fixed top-0 left-0 w-full z-50 px-4 md:px-16 h-16 flex justify-between items-center bg-surface/40 backdrop-blur-md border-b border-outline-variant/20">
        <BrandLogo size="sm" showText />
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <Lock className="w-4 h-4 text-secondary" />
            <div>
              <span className="label-caps text-[10px] text-secondary">Secure Link</span>
              <p className="font-mono text-xs text-primary">NODE: {secureNode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary text-on-primary rounded-full">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
            <span className="label-caps text-[10px]">LIVE</span>
          </div>
        </div>
      </header>

      <main className="relative h-screen flex flex-col items-center justify-center pt-16 pb-28 z-10 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative mb-6">
            <div className="absolute inset-0 scan-line rounded-full pointer-events-none opacity-50" />
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="relative z-10 h-40 w-40 md:h-56 md:w-56 object-contain drop-shadow-[0_0_50px_rgba(0,238,252,0.35)]"
            />
          </div>
          <h1 className="font-sora text-3xl md:text-5xl font-bold text-primary tracking-tight">
            {BRAND.nameUpper}
          </h1>
          <p className="label-caps text-secondary mt-2">{BRAND.tagline}</p>
          <div className="h-1 w-24 bg-secondary-container rounded-full mt-4" />
          <p className="text-sm text-on-surface-variant mt-4 max-w-md">{BRAND.shortTagline}</p>
        </motion.div>

        <div className="absolute top-[30%] left-0 md:left-[8%] hidden lg:block">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel p-4 rounded-xl w-48 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <Verified className="w-4 h-4 text-secondary" />
              <span className="label-caps text-[10px] text-on-surface-variant">System Integrity</span>
            </div>
            <div className="font-sora text-2xl font-bold text-primary">100%</div>
          </motion.div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full z-50 px-4 md:px-16 pb-8 pt-4 flex flex-col md:flex-row items-center justify-between gap-6 bg-surface/60 backdrop-blur-md border-t border-outline-variant/20">
        <PartnerFooter />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => navigate(PATHS.roleSelection)}
          className="w-full md:w-auto bg-primary px-8 py-3 rounded-lg text-on-primary flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
        >
          <span className="label-caps">INITIALIZE COMMAND</span>
          <ArrowRight className="w-5 h-5 text-secondary-container" />
        </motion.button>
      </footer>
    </div>
  );
}
