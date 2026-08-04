import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from './utils';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface InlineAlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const styles: Record<AlertVariant, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-900',
};

const icons: Record<AlertVariant, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export function InlineAlert({
  variant = 'info',
  title,
  children,
  className,
}: InlineAlertProps) {
  const Icon = icons[variant];
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border px-3.5 py-3 text-sm',
        styles[variant],
        className,
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && 'mt-0.5', 'leading-relaxed opacity-90')}>{children}</div>
      </div>
    </div>
  );
}
