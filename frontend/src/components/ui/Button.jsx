import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-primary text-on-primary hover:brightness-110 shadow-md shadow-primary/15',
  secondary: 'border border-secondary text-secondary hover:bg-secondary-container/10',
  ghost: 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low',
  danger: 'bg-error text-white hover:brightness-110',
};

const sizes = {
  sm: 'px-3 py-2 text-[10px]',
  md: 'px-5 py-2.5 text-xs',
  lg: 'px-8 py-3 text-xs',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  onClick,
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  type = 'button',
}) {
  const classes = `label-caps inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-60 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`;

  const content = (
    <>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {Icon && !loading && <Icon className="w-4 h-4" />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <motion.button
      type={type}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {content}
    </motion.button>
  );
}
