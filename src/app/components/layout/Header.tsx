import { Bell, LogOut, Search, User } from 'lucide-react';
import { Button } from '../ui/button';
import type { UserRole } from '../../../types';

interface HeaderProps {
  userRole: UserRole;
  onLogout: () => void;
}

export function Header({ userRole, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <div className="lg:hidden">
            <p className="text-xs font-medium uppercase tracking-wider text-rw-blue">MINECOFIN</p>
            <p className="truncate text-sm font-semibold text-slate-900">NIPMS</p>
          </div>
          <div className="relative hidden max-w-md lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search investments, documents, activities..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          <div className="hidden items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rw-blue text-white">
              <User className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-900">
                {userRole === 'admin' ? 'Portfolio Director' : 'SOE Representative'}
              </p>
              <p className="text-[10px] text-slate-500">
                {userRole === 'admin' ? 'MINECOFIN — Admin' : 'Company Portal'}
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={onLogout} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
