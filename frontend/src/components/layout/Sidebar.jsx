import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Radio,
  Network,
  Brain,
  FileText,
  Key,
  Truck,
  Settings,
  HelpCircle,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { PATHS } from '../../routes/paths';
import { useApp } from '../../context/AppContext';
import { BRAND } from '../../data/brand';

const navItems = [
  { to: PATHS.doctor.dashboard, icon: LayoutDashboard, label: 'Command Center' },
  { to: PATHS.doctor.patients, icon: Users, label: 'Active Patients' },
  { to: PATHS.doctor.consultation, icon: Radio, label: 'Live Consultation' },
  { to: PATHS.doctor.arDiagnostic, icon: Network, label: 'AR Diagnostic' },
  { to: PATHS.doctor.aiInsights, icon: Brain, label: 'AI Insights' },
  { to: PATHS.doctor.report, icon: FileText, label: 'Clinical Report' },
];

function NavItem({ to, icon: Icon, label, collapsed, onClick }) {
  const base = collapsed
    ? 'mx-1.5 my-0.5 px-0 py-3 flex items-center justify-center rounded-lg transition-all'
    : 'mx-2 my-0.5 px-4 py-3 flex items-center gap-3 rounded-lg transition-all';

  const active = 'bg-secondary-container text-on-secondary-container';
  const inactive = 'text-[#abc7ff] hover:text-white hover:bg-white/5';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`w-full text-left ${base} ${inactive}`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!collapsed && <span className="label-caps truncate">{label}</span>}
      </button>
    );
  }

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="label-caps truncate">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ onPlaceholder, onSOS, onSettings }) {
  const { secureNode, sidebarCollapsed, toggleSidebar } = useApp();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 256 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen z-40 bg-primary hidden md:flex flex-col shadow-lg border-r border-white/5 overflow-hidden"
    >
      {/* Header — flush to top */}
      <div className="shrink-0 px-3 pt-4 pb-3 border-b border-white/10">
        <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'flex-col' : 'justify-between'}`}>
          <div
            className={`flex items-center min-w-0 ${sidebarCollapsed ? 'justify-center' : 'gap-3 flex-1'}`}
          >
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="w-10 h-10 object-contain rounded-lg bg-white/10 p-0.5 shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h2 className="font-sora font-semibold text-on-primary text-sm leading-tight truncate">
                  {BRAND.nameUpper}
                </h2>
                <p className="label-caps text-[10px] text-[#00dbe9]/70 truncate">Node: {secureNode}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-2 rounded-lg text-[#abc7ff] hover:text-white hover:bg-white/10 shrink-0 transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-1 scrollbar-hide">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
        ))}
        <NavItem
          icon={Key}
          label="Encryption Keys"
          collapsed={sidebarCollapsed}
          onClick={() => onPlaceholder?.('Encryption Keys')}
        />
        <NavItem
          icon={Truck}
          label="Medical Logistics"
          collapsed={sidebarCollapsed}
          onClick={() => onPlaceholder?.('Medical Logistics')}
        />
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-white/10 space-y-1">
        <button
          type="button"
          onClick={() => onSOS?.()}
          title="Emergency SOS"
          className={`w-full bg-error text-white label-caps rounded-lg flex items-center justify-center gap-2 pulse-emergency hover:brightness-110 transition-all ${
            sidebarCollapsed ? 'p-3' : 'py-3.5 px-4'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {!sidebarCollapsed && <span>Emergency SOS</span>}
        </button>
        <NavItem
          icon={Settings}
          label="Settings"
          collapsed={sidebarCollapsed}
          onClick={() => onSettings?.(false)}
        />
        <NavItem
          icon={HelpCircle}
          label="Support"
          collapsed={sidebarCollapsed}
          onClick={() => onSettings?.(true)}
        />
      </div>
    </motion.aside>
  );
}
