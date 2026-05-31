import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={`fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] ${widths[size]} -translate-x-1/2 -translate-y-1/2 glass-card rounded-2xl p-6 shadow-2xl`}
          >
            <div className="flex justify-between items-start mb-4">
              {title && <h2 className="font-sora text-lg font-bold text-primary">{title}</h2>}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
