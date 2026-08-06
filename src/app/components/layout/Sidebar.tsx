import { SignOut, X } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import type { AppView, AuthUser } from '../../../types';
import { RwandaFlag } from '../brand/RwandaFlag';
import { leadershipNav, mainNav, settingsNav, visibleNav, type NavItem } from './nav';
import { cn } from '../ui/utils';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  user: AuthUser;
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function NavContent({
  currentView,
  onNavigate,
  user,
  onLogout,
  onClose,
}: {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  user: AuthUser;
  onLogout: () => void;
  onClose?: () => void;
}) {
  const main = visibleNav(mainNav, user);
  const leadership = visibleNav(leadershipNav, user);
  const settings = visibleNav(settingsNav, user);

  const handleNavigate = (view: AppView) => {
    onNavigate(view);
    onClose?.();
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = currentView === item.key;
    const Icon = item.icon;

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => handleNavigate(item.key)}
        aria-current={isActive ? 'page' : undefined}
        className={cn('sidebar-nav-link', isActive && 'active')}
      >
        <Icon className="nav-icon" weight="regular" aria-hidden />
        <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-5 pb-4 pt-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <RwandaFlag size="sm" />
            <div className="min-w-0 self-center">
              <p className="truncate leading-none text-[1.4rem] font-semibold tracking-tight text-white [font-family:var(--font-display)]">
                NIPMS
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" weight="bold" />
            </button>
          )}
        </div>
      </div>

      <nav
        className={cn(
          'min-h-0 flex-1 py-5 pr-0',
          onClose ? 'overflow-x-hidden overflow-y-auto' : 'overflow-hidden',
        )}
        aria-label="Main navigation"
      >
        {main.map(renderNavItem)}

        {leadership.length > 0 && (
          <>
            <div className="my-3 ml-4 mr-6 border-t border-white/10" />
            {leadership.map(renderNavItem)}
          </>
        )}

        {settings.length > 0 && (
          <>
            <div className="my-3 ml-4 mr-6 border-t border-white/10" />
            {settings.map(renderNavItem)}
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/10 px-3 py-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onLogout}
            className="w-full justify-center gap-1.5 border-0 bg-white text-rw-blue-dark hover:bg-white/90"
          >
            <SignOut className="h-4 w-4" weight="regular" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  currentView,
  onNavigate,
  user,
  onLogout,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      {/* Desktop — overflow visible so carved corners are not clipped */}
      <aside className="nipms-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <NavContent currentView={currentView} onNavigate={onNavigate} user={user} onLogout={onLogout} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={cn(
            'absolute inset-0 bg-slate-900/50 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="Close navigation overlay"
          onClick={onMobileClose}
          tabIndex={mobileOpen ? 0 : -1}
        />
        <aside
          className={cn(
            'nipms-sidebar absolute inset-y-0 left-0 w-[min(20rem,88vw)] shadow-md transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <NavContent
            currentView={currentView}
            onNavigate={onNavigate}
            user={user}
            onLogout={onLogout}
            onClose={onMobileClose}
          />
        </aside>
      </div>
    </>
  );
}
