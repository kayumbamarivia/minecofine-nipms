import { cn } from './utils';

interface LoadingStateProps {
  label?: string;
  className?: string;
  compact?: boolean;
}

export function LoadingState({
  label = 'Loading…',
  className,
  compact = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-slate-500',
        compact ? 'gap-2 py-6' : 'gap-3 py-16',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-rw-blue"
        aria-hidden
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200/80', className)}
      aria-hidden
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
