import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { StatusBadge } from './ui/status-badge';
import { Clock, Building2 } from 'lucide-react';
import type { PipelineItem } from '../../types';
import { formatRwf } from '../../utils/format';

export type { PipelineItem, PipelineStatus } from '../../types';

interface PipelineCardProps {
  item: PipelineItem;
  onViewDetails: (item: PipelineItem) => void;
  currentUserLevel: 'analyst' | 'hod' | 'minister';
}

const investmentTypeLabels = {
  new_investment: 'New Investment',
  existing_soe: 'Existing SOE',
  equity_injection: 'Equity Injection',
  acquisition: 'Acquisition',
};

export function PipelineCard({ item, onViewDetails }: PipelineCardProps) {
  return (
    <Card className="group overflow-hidden border-slate-200 shadow-xs transition-all duration-200 hover:border-rw-blue/25 hover:shadow-sm">
      <div className="h-0.5 bg-rw-blue/0 transition-colors group-hover:bg-rw-blue/40" />
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-rw-blue" />
              <CardTitle className="truncate text-base">{item.companyName}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {item.sector}
              </Badge>
              <StatusBadge status={item.status} kind="pipeline" />
              <Badge variant="secondary" className="text-[10px]">
                {investmentTypeLabels[item.investmentType]}
              </Badge>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-rw-blue">{formatRwf(item.investmentAmount, true)}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Investment
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {item.ownership !== undefined && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Ownership
              </p>
              <p className="mt-0.5 font-semibold text-slate-900">{item.ownership}%</p>
            </div>
          )}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Stage</p>
            <p className="mt-0.5 truncate font-semibold text-slate-900">{item.stage}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Manager</p>
            <p className="mt-0.5 truncate font-semibold text-slate-900">{item.projectManager}</p>
          </div>
          {item.ministry && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Ministry
              </p>
              <p className="mt-0.5 font-semibold text-rw-blue">{item.ministry}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Next Activity
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">{item.nextActivity}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" /> {item.nextActivityDate}
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-rw-blue/20 text-rw-blue hover:bg-rw-blue/5"
          onClick={() => onViewDetails(item)}
        >
          View Investment Details
        </Button>
      </CardContent>
    </Card>
  );
}
