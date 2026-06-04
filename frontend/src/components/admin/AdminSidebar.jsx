import {
  LayoutDashboard,
  Stethoscope,
  ClipboardList,
  Users,
  Bell,
  Activity,
  Clock,
  FileText,
  Brain,
  Settings,
} from 'lucide-react';

export const ADMIN_NAV_GROUPS = [
  {
    label: 'Dashboard',
    items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }],
  },
  {
    label: 'Personnel',
    items: [
      { id: 'doctors', label: 'Doctors', icon: Stethoscope },
      { id: 'medicalStaff', label: 'Medical Staff', icon: ClipboardList },
      { id: 'patients', label: 'Soldiers', icon: Users },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'alerts', label: 'Alerts', icon: Bell },
      { id: 'activity', label: 'Activity', icon: Activity },
      { id: 'queue', label: 'Queue', icon: Clock },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'recommendations', label: 'AI Tips', icon: Brain },
    ],
  },
  {
    label: 'System',
    items: [{ id: 'system', label: 'Configuration', icon: Settings }],
  },
];

export default function AdminSidebar({ activeTab, onSelect }) {
  return (
    <aside className="w-56 shrink-0 border-r border-surface-container bg-surface-container-low/40 flex flex-col">
      <div className="p-4 border-b border-surface-container">
        <p className="label-caps text-[10px] text-secondary">Navigation</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="label-caps text-[9px] text-on-surface-variant px-2 mb-2">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-primary text-on-primary font-medium'
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
