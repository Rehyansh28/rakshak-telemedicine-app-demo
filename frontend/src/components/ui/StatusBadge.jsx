const styles = {
  critical: 'bg-error text-white',
  warning: 'bg-amber-500 text-white',
  stable: 'bg-success text-white',
  monitoring: 'bg-secondary text-white',
  warning: 'bg-amber-500 text-white',
  consultation: 'bg-secondary-container text-on-secondary-container',
  connected: 'bg-success/10 text-success border border-success/30',
  syncing: 'bg-secondary-container/20 text-secondary border border-secondary/30',
  pending: 'bg-surface-container-highest text-on-surface-variant',
  secure: 'bg-primary text-on-primary',
};

export default function StatusBadge({ status, label, className = '' }) {
  const text = label || status;
  return (
    <span
      className={`label-caps inline-flex items-center px-2.5 py-1 rounded-full text-[10px] ${styles[status] || styles.stable} ${className}`}
    >
      {text}
    </span>
  );
}
