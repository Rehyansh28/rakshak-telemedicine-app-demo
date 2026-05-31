import { motion } from 'framer-motion';

export default function PatientPageHeader({ eyebrow, title, description, actions }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4"
    >
      <div>
        {eyebrow && <p className="label-caps text-secondary mb-2">{eyebrow}</p>}
        <h1 className="font-sora text-2xl md:text-3xl font-bold text-primary tracking-tight">{title}</h1>
        {description && (
          <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </motion.header>
  );
}
