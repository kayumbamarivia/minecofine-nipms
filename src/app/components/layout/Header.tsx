import { List, User } from '@phosphor-icons/react';
import type { AppView, AuthUser } from '../../../types';
import { ROLE_SHORT } from '../../../utils/roles';
import { VIEW_TITLES } from './nav';

interface HeaderProps {
  user: AuthUser;
  currentView: AppView;
  onMenuOpen?: () => void;
}

export function Header({
  user,
  currentView,
  onMenuOpen,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="flex h-[var(--spacing-header)] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuOpen}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open navigation menu"
          >
            <List className="h-5 w-5" weight="bold" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wider text-rw-blue">
              {user.companyName ?? 'MINECOFIN'}
            </p>
            <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
              {VIEW_TITLES[currentView]}
            </h1>
          </div>
        </div>
        <div className="hidden items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-rw-blue text-white"
            aria-hidden
          >
            <User className="h-4 w-4" weight="bold" />
          </div>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
            <p className="truncate text-xs text-slate-500">{ROLE_SHORT[user.role]}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
