import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {badge && (
          <span className="mb-2 inline-flex items-center rounded-full bg-rw-blue/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-rw-blue">
            {badge}
          </span>
        )}
        <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  accent?: 'blue' | 'green' | 'yellow' | 'slate';
}

const accentStyles = {
  blue: 'bg-rw-blue/10 text-rw-blue',
  green: 'bg-rw-green/10 text-rw-green',
  yellow: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-600',
};

const changeStyles = {
  positive: 'text-rw-green',
  negative: 'text-red-600',
  neutral: 'text-slate-500',
};

export function StatCard({ label, value, change, changeType = 'positive', icon, accent = 'blue' }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {change && (
            <p className={`mt-1.5 text-xs font-semibold ${changeStyles[changeType]}`}>{change}</p>
          )}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentStyles[accent]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-rw-blue transition-all duration-300 group-hover:w-full" />
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PanelHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function PanelBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
