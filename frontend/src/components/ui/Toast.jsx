import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info } from 'lucide-react';
import { useApp } from '../../context/useApp';

export default function ToastContainer() {
  const { toast } = useApp();

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pointer-events-auto flex items-center gap-3 glass-card rounded-xl px-5 py-3 shadow-lg border border-secondary/20 min-w-[280px]"
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-success shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-secondary shrink-0" />
            )}
            <p className="text-sm text-on-surface">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
