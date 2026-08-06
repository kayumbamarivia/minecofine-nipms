import {
  SquaresFour,
  Briefcase,
  CheckSquare,
  Files,
  NotePencil,
  Pulse,
  Buildings,
  TreeStructure,
  ChartLineUp,
  UsersThree,
  GearSix,
  type Icon,
} from '@phosphor-icons/react';
import type { AppView, AuthUser } from '../../../types';
import {
  canCreateSubmission,
  canViewLeadershipDashboards,
  isCompanyRole,
  isMinistryRole,
} from '../../../utils/roles';

export interface NavItem {
  key: AppView;
  label: string;
  shortLabel?: string;
  icon: Icon;
  show?: (user: AuthUser) => boolean;
}

export const mainNav: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: SquaresFour },
  { key: 'portfolio', label: 'Investment Portfolio', shortLabel: 'Portfolio', icon: Briefcase },
  { key: 'submissions', label: 'Submissions & Approvals', shortLabel: 'Submissions', icon: TreeStructure },
  {
    key: 'processes',
    label: 'Submission Workspace',
    shortLabel: 'Workspace',
    icon: NotePencil,
    show: (u) => canCreateSubmission(u.role),
  },
  { key: 'action-points', label: 'Action Points', icon: CheckSquare },
  { key: 'documents', label: 'Document Registry', shortLabel: 'Documents', icon: Files },
  {
    key: 'reports',
    label: 'Reports & Extracts',
    shortLabel: 'Reports',
    icon: ChartLineUp,
    show: (u) => canViewLeadershipDashboards(u.role) || isCompanyRole(u.role),
  },
  {
    key: 'users',
    label: 'User Administration',
    shortLabel: 'Users',
    icon: UsersThree,
    show: (u) => isMinistryRole(u.role),
  },
];

export const settingsNav: NavItem[] = [
  { key: 'settings', label: 'Settings', icon: GearSix },
];

export const leadershipNav: NavItem[] = [
  {
    key: 'operations',
    label: 'Operations',
    icon: Pulse,
    show: (u) => canViewLeadershipDashboards(u.role),
  },
  {
    key: 'inter-ministerial',
    label: 'Inter-Ministerial Hub',
    shortLabel: 'Coordination',
    icon: Buildings,
    show: (u) => canViewLeadershipDashboards(u.role),
  },
];

export const VIEW_TITLES: Record<AppView, string> = {
  dashboard: 'Portfolio Dashboard',
  portfolio: 'Investment Portfolio',
  submissions: 'Submissions & Approvals',
  processes: 'Submission Workspace',
  'action-points': 'Action Points',
  documents: 'Document Registry',
  reports: 'Reports & Extracts',
  users: 'User Administration',
  settings: 'Settings',
  operations: 'Operational Performance',
  'inter-ministerial': 'Inter-Ministerial Coordination',
};

export function visibleNav(items: NavItem[], user: AuthUser) {
  return items.filter((item) => !item.show || item.show(user));
}
