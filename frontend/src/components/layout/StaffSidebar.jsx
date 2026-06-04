import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Activity,
  Camera,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { PATHS } from '../../routes/paths';
import { useApp } from '../../context/useApp';
import { BRAND } from '../../data/brand';

const mainNav = [
  { to: PATHS.staff.dashboard, icon: LayoutDashboard, label: 'Dashboard' },
  { to: PATHS.staff.patients, icon: Users, label: 'Soldiers' },
];

const sessionNav = [
  { to: PATHS.staff.sensors, icon: Activity, label: 'Sensors' },
  { to: PATHS.staff.camera, icon: Camera, label: 'Camera' },
  { to: PATHS.staff.waitingRoom, icon: Clock, label: 'Doctor Handoff' },
];

function NavItem({ to, icon: Icon, label, collapsed, disabled, onDisabledClick }) {
  const base = collapsed
    ? 'mx-1.5 my-0.5 px-0 py-3 flex items-center justify-center rounded-lg transition-all w-full'
    : 'mx-2 my-0.5 px-4 py-3 flex items-center gap-3 rounded-lg transition-all w-full';

  const active = 'bg-secondary-container text-on-secondary-container';
  const inactive = 'text-[#abc7ff] hover:text-white hover:bg-white/5';
  const disabledCls = 'opacity-40 cursor-not-allowed pointer-events-auto';

  if (disabled) {
    return (
      <button
        type="button"
        title={collapsed ? label : undefined}
        onClick={onDisabledClick}
        className={`${base} ${inactive} ${disabledCls}`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!collapsed && <span className="label-caps truncate text-left">{label}</span>}
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

export default function StaffSidebar() {
  const navigate = useNavigate();
  const {
    secureNode,
    sidebarCollapsed,
    toggleSidebar,
    selectedPatient,
    staff,
    showToast,
    staffLogout,
    setRole,
  } = useApp();

  const hasPatient = !!selectedPatient?.id;
  const onNeedPatient = () =>
    showToast('Select a soldier from Soldiers first', 'info');

  const handleExit = () => {
    staffLogout();
    setRole(null);
    navigate(PATHS.roleSelection);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 256 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen z-40 bg-primary hidden md:flex flex-col shadow-lg border-r border-white/5 overflow-hidden"
    >
      <div className="shrink-0 px-3 pt-4 pb-3 border-b border-white/10">
        <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'flex-col' : 'justify-between'}`}>
          <div className={`flex items-center min-w-0 ${sidebarCollapsed ? 'justify-center' : 'gap-3 flex-1'}`}>
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="w-10 h-10 object-contain rounded-lg bg-white/10 p-0.5 shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h2 className="font-sora font-semibold text-on-primary text-sm leading-tight truncate">
                  Staff Console
                </h2>
                <p className="label-caps text-[10px] text-[#00dbe9]/70 truncate">Node: {secureNode}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-2 rounded-lg text-[#abc7ff] hover:text-white hover:bg-white/10 shrink-0"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>
        {!sidebarCollapsed && staff?.name && (
          <p className="text-[10px] text-[#abc7ff] mt-2 truncate">{staff.rank} · {staff.name}</p>
        )}
        {!sidebarCollapsed && hasPatient && (
          <div className="mt-2 px-2 py-1.5 rounded-lg bg-white/10 border border-secondary/30">
            <p className="label-caps text-[9px] text-secondary">Active soldier</p>
            <p className="text-xs text-on-primary font-semibold truncate">{selectedPatient.name}</p>
            <p className="font-mono text-[10px] text-[#abc7ff]">{selectedPatient.id}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-1">
        {!sidebarCollapsed && (
          <p className="label-caps text-[9px] text-[#abc7ff]/60 px-4 mb-1">Main</p>
        )}
        {mainNav.map((item) => (
          <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
        ))}

        {!sidebarCollapsed && (
          <p className="label-caps text-[9px] text-[#abc7ff]/60 px-4 mt-4 mb-1">Connect to Doctor</p>
        )}
        {sessionNav.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            collapsed={sidebarCollapsed}
            disabled={!hasPatient}
            onDisabledClick={onNeedPatient}
          />
        ))}
      </nav>

      <div className="shrink-0 p-3 border-t border-white/10">
        <button
          type="button"
          onClick={handleExit}
          title="Exit"
          className={`w-full label-caps rounded-lg flex items-center justify-center gap-2 text-[#abc7ff] hover:text-white hover:bg-white/10 ${
            sidebarCollapsed ? 'p-3' : 'py-3 px-4'
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!sidebarCollapsed && <span>Exit</span>}
        </button>
      </div>
    </motion.aside>
  );
}
