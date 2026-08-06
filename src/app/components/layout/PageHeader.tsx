import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({ title, description, badge, actions, meta }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {badge && (
          <span className="mb-2 inline-flex items-center rounded-md bg-rw-blue-subtle px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-rw-blue">
            {badge}
          </span>
        )}
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-900 [font-family:var(--font-display)] sm:text-[1.875rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-slate-600">{description}</p>
        )}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
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
  blue: 'bg-rw-blue-subtle text-rw-blue',
  green: 'bg-rw-green-subtle text-rw-green-dark',
  yellow: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-600',
};

const changeStyles = {
  positive: 'text-rw-green-dark',
  negative: 'text-red-700',
  neutral: 'text-slate-500',
};

export function StatCard({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
  accent = 'blue',
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[1.75rem] font-bold tracking-tight text-slate-900">{value}</p>
          {change && (
            <p className={cn('mt-1.5 text-sm font-medium', changeStyles[changeType])}>{change}</p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              accentStyles[accent],
            )}
            aria-hidden
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-xs', className)}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function PanelBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
