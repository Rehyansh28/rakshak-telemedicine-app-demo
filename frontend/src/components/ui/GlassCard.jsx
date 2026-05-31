import { motion } from 'framer-motion';

export default function GlassCard({
  children,
  className = '',
  hover = false,
  asButton = false,
  onClick,
  borderAccent = false,
}) {
  const Component = onClick || asButton ? motion.button : motion.div;
  return (
    <Component
      type={onClick || asButton ? 'button' : undefined}
      onClick={onClick}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      className={`glass-card rounded-xl p-4 text-left w-full ${borderAccent ? 'border-l-4 border-l-secondary-container' : ''} ${className}`}
    >
      {children}
    </Component>
  );
}
