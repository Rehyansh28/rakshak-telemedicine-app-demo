import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function SlideOver({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-md bg-surface border-l border-outline-variant/30 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <h2 className="font-sora text-lg font-bold text-primary">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
