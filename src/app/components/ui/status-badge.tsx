import { cn } from './utils';
import type { PipelineStatus, SubmissionStatus } from '../../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../../utils/roles';

const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  proposed: 'Proposed',
  review: 'Under Review',
  hod_approval: 'HoD Approval',
  ministerial_approval: 'Ministerial Approval',
  approved: 'Approved',
  active: 'Active',
};

const PIPELINE_COLORS: Record<PipelineStatus, string> = {
  proposed: 'bg-slate-100 text-slate-700 border-slate-200',
  review: 'bg-blue-50 text-blue-800 border-blue-200',
  hod_approval: 'bg-amber-50 text-amber-800 border-amber-200',
  ministerial_approval: 'bg-orange-50 text-orange-800 border-orange-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const ENTITY_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  review: 'bg-blue-50 text-blue-800 border-blue-200',
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
};

const NEUTRAL = 'bg-slate-100 text-slate-700 border-slate-200';

type StatusKind = 'submission' | 'pipeline' | 'entity' | 'generic';

interface StatusBadgeProps {
  status: string;
  kind?: StatusKind;
  className?: string;
}

function labelFor(status: string, kind: StatusKind): string {
  if (kind === 'submission' && status in STATUS_LABELS) {
    return STATUS_LABELS[status as SubmissionStatus];
  }
  if (kind === 'pipeline' && status in PIPELINE_LABELS) {
    return PIPELINE_LABELS[status as PipelineStatus];
  }
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function colorFor(status: string, kind: StatusKind): string {
  if (kind === 'submission' && status in STATUS_COLORS) {
    return STATUS_COLORS[status as SubmissionStatus];
  }
  if (kind === 'pipeline' && status in PIPELINE_COLORS) {
    return PIPELINE_COLORS[status as PipelineStatus];
  }
  if (kind === 'entity' && status in ENTITY_COLORS) {
    return ENTITY_COLORS[status];
  }
  return NEUTRAL;
}

export function StatusBadge({ status, kind = 'generic', className }: StatusBadgeProps) {
  const label = labelFor(status, kind);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        colorFor(status, kind),
        className,
      )}
      title={label}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export { PIPELINE_LABELS, PIPELINE_COLORS };
