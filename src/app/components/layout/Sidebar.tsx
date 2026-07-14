import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  FileText,
  ClipboardEdit,
  BarChart3,
  Activity,
  Crown,
  Building2,
  ChevronRight,
} from 'lucide-react';
import type { AppView, UserRole } from '../../../types';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  userRole: UserRole;
}

interface NavItem {
  key: AppView;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const mainNav: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'portfolio', label: 'Investment Portfolio', icon: Briefcase },
  { key: 'activities', label: 'Activities & Tasks', icon: CheckSquare },
  { key: 'documents', label: 'Document Registry', icon: FileText },
  { key: 'data-entry', label: 'Data Entry', icon: ClipboardEdit },
];

const adminNav: NavItem[] = [
  { key: 'consolidated', label: 'Consolidated View', icon: BarChart3, adminOnly: true },
  { key: 'operations', label: 'Operations', icon: Activity, adminOnly: true },
  { key: 'executive', label: 'Executive Briefing', icon: Crown, adminOnly: true },
  { key: 'inter-ministerial', label: 'Inter-Ministerial Hub', icon: Building2, adminOnly: true },
];

export function Sidebar({ currentView, onNavigate, userRole }: SidebarProps) {
  const renderNavItem = (item: NavItem) => {
    const isActive = currentView === item.key;
    const Icon = item.icon;

    return (
      <button
        key={item.key}
        onClick={() => onNavigate(item.key)}
        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-white/15 text-white shadow-sm'
            : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-rw-yellow' : 'text-blue-200/70 group-hover:text-blue-100'}`} />
        <span className="flex-1">{item.label}</span>
        {isActive && <ChevronRight className="h-4 w-4 text-rw-yellow" />}
      </button>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-gradient-to-b from-rw-blue-dark via-rw-blue to-rw-blue-dark lg:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-white shadow-lg">
            <div className="absolute inset-0 overflow-hidden rounded-lg">
              <div className="absolute left-0 top-0 h-1/3 w-full bg-rw-blue" />
              <div className="absolute left-0 top-1/3 h-1/3 w-full bg-rw-yellow" />
              <div className="absolute left-0 top-2/3 h-1/3 w-full bg-rw-green" />
            </div>
            <span className="relative text-[10px] font-bold text-rw-blue-dark">RW</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-blue-200/70">
              Republic of Rwanda
            </p>
            <p className="truncate text-sm font-semibold leading-tight text-white">
              NIPMS
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-blue-200/60">
          National Investment Portfolio Management System
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-blue-300/50">
          Main Menu
        </p>
        {mainNav.map(renderNavItem)}

        {userRole === 'admin' && (
          <>
            <div className="my-4 border-t border-white/10" />
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-blue-300/50">
              Administration
            </p>
            {adminNav.map(renderNavItem)}
          </>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/10 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-blue-200/60">Ministry</p>
          <p className="mt-1 text-xs font-semibold leading-snug text-white">
            Ministry of Finance and Economic Planning
          </p>
          <p className="mt-2 text-[10px] text-blue-200/50">Kigali, Rwanda</p>
        </div>
      </div>
    </aside>
  );
}
