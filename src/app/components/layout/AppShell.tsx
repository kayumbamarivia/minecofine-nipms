import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { AppView, AuthUser } from '../../../types';

interface AppShellProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  user: AuthUser;
  onLogout: () => void;
  onChangePassword?: () => void;
  children: ReactNode;
}

export function AppShell({
  currentView,
  onNavigate,
  user,
  onLogout,
  onChangePassword,
  children,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentView]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-white lg:pl-64">
        <Header
          user={user}
          currentView={currentView}
          onMenuOpen={() => setMobileNavOpen(true)}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1400px] flex-1 bg-page px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 text-xs text-slate-500 sm:flex-row">
            <p>© 2026 Republic of Rwanda — Ministry of Finance and Economic Planning</p>
            <p className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rw-green" aria-hidden />
              NIPMS — National Investment Portfolio Management System
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
