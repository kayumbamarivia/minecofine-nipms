import type { ReactNode } from 'react';
import { Tray } from '@phosphor-icons/react';
import { cn } from './utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className,
      )}
      role="status"
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {icon ?? <Tray className="h-5 w-5" aria-hidden />}
      </div>
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-base leading-relaxed text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
