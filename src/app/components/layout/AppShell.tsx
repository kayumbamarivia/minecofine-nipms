import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { AppView, UserRole } from '../../types';

interface AppShellProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  userRole: UserRole;
  onLogout: () => void;
  children: ReactNode;
}

export function AppShell({ currentView, onNavigate, userRole, onLogout, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar currentView={currentView} onNavigate={onNavigate} userRole={userRole} />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <Header userRole={userRole} onLogout={onLogout} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white px-6 py-3">
          <div className="flex flex-col items-center justify-between gap-2 text-xs text-slate-500 sm:flex-row">
            <p>© 2026 Republic of Rwanda — Ministry of Finance and Economic Planning</p>
            <p className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-rw-green" />
              National Investment Portfolio Management System v0.1
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
