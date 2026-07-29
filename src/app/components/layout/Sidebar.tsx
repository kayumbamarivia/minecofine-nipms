import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  FileText,
  ClipboardEdit,
  Activity,
  Building2,
  ChevronRight,
  GitBranch,
  LineChart,
  Users,
} from 'lucide-react';
import type { AppView, AuthUser } from '../../../types';
import { RwandaFlag } from '../brand/RwandaFlag';
import {
  canCreateSubmission,
  canViewLeadershipDashboards,
  isCompanyRole,
  isMinistryRole,
} from '../../../utils/roles';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  user: AuthUser;
}

interface NavItem {
  key: AppView;
  label: string;
  icon: typeof LayoutDashboard;
  show?: (user: AuthUser) => boolean;
}

const mainNav: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'portfolio', label: 'Investment Portfolio', icon: Briefcase },
  { key: 'submissions', label: 'Submissions & Approvals', icon: GitBranch },
  {
    key: 'processes',
    label: 'Submission Workspace',
    icon: ClipboardEdit,
    show: (u) => canCreateSubmission(u.role),
  },
  { key: 'action-points', label: 'Action Points', icon: CheckSquare },
  { key: 'documents', label: 'Document Registry', icon: FileText },
  {
    key: 'reports',
    label: 'Reports & Extracts',
    icon: LineChart,
    show: (u) => canViewLeadershipDashboards(u.role) || isCompanyRole(u.role),
  },
  {
    key: 'users',
    label: 'User Administration',
    icon: Users,
    show: (u) => isMinistryRole(u.role),
  },
];

const leadershipNav: NavItem[] = [
  {
    key: 'operations',
    label: 'Operations',
    icon: Activity,
    show: (u) => canViewLeadershipDashboards(u.role),
  },
  {
    key: 'inter-ministerial',
    label: 'Inter-Ministerial Hub',
    icon: Building2,
    show: (u) => canViewLeadershipDashboards(u.role),
  },
];

export function Sidebar({ currentView, onNavigate, user }: SidebarProps) {
  const renderNavItem = (item: NavItem) => {
    if (item.show && !item.show(user)) return null;

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
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${
            isActive ? 'text-rw-yellow' : 'text-blue-200/70 group-hover:text-blue-100'
          }`}
        />
        <span className="flex-1">{item.label}</span>
        {isActive && <ChevronRight className="h-4 w-4 text-rw-yellow" />}
      </button>
    );
  };

  const visibleLeadership = leadershipNav.some((item) => !item.show || item.show(user));

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-gradient-to-b from-rw-blue-dark via-rw-blue to-rw-blue-dark lg:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <RwandaFlag size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-blue-200/70">
              Republic of Rwanda
            </p>
            <p className="truncate text-sm font-semibold leading-tight text-white">NIPMS</p>
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

        {visibleLeadership && (
          <>
            <div className="my-4 border-t border-white/10" />
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-blue-300/50">
              Leadership & Analytics
            </p>
            {leadershipNav.map(renderNavItem)}
          </>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/10 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-blue-200/60">
            {user.companyName ?? 'MINECOFIN'}
          </p>
          <p className="mt-1 text-xs font-semibold leading-snug text-white">{user.fullName}</p>
          <p className="mt-2 text-[10px] text-blue-200/50">Kigali, Rwanda</p>
        </div>
      </div>
    </aside>
  );
}
