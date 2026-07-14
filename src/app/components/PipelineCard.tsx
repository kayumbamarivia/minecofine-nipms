import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Building2 } from 'lucide-react';
import type { PipelineItem } from '../../types';
import { formatRwf } from '../../utils/format';

export type { PipelineItem, PipelineStatus } from '../../types';

interface PipelineCardProps {
  item: PipelineItem;
  onViewDetails: (item: PipelineItem) => void;
  currentUserLevel: 'analyst' | 'hod' | 'minister';
}

const statusConfig = {
  proposed: { color: 'bg-slate-500', label: 'Proposed', icon: Clock },
  review: { color: 'bg-blue-500', label: 'Under Review', icon: AlertCircle },
  hod_approval: { color: 'bg-amber-500', label: 'HoD Approval', icon: AlertCircle },
  ministerial_approval: { color: 'bg-orange-500', label: 'Ministerial Approval', icon: TrendingUp },
  approved: { color: 'bg-rw-green', label: 'Approved', icon: CheckCircle2 },
  active: { color: 'bg-rw-green-dark', label: 'Active', icon: CheckCircle2 },
};

const investmentTypeLabels = {
  new_investment: 'New Investment',
  existing_soe: 'Existing SOE',
  equity_injection: 'Equity Injection',
  acquisition: 'Acquisition',
};

export function PipelineCard({ item, onViewDetails }: PipelineCardProps) {
  const statusInfo = statusConfig[item.status];
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:border-rw-blue/30 hover:shadow-lg">
      <div className="h-1 bg-gradient-to-r from-rw-blue via-rw-yellow to-rw-green opacity-0 transition-opacity group-hover:opacity-100" />
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-rw-blue" />
              <CardTitle className="truncate text-base">{item.companyName}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{item.sector}</Badge>
              <Badge className={`${statusInfo.color} gap-1 text-[10px] text-white`}>
                <StatusIcon className="h-3 w-3" /> {statusInfo.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {investmentTypeLabels[item.investmentType]}
              </Badge>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-rw-blue">{formatRwf(item.investmentAmount, true)}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Investment</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {item.ownership !== undefined && (
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Ownership</p>
              <p className="mt-0.5 font-semibold text-slate-900">{item.ownership}%</p>
            </div>
          )}
          <div className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Stage</p>
            <p className="mt-0.5 truncate font-semibold text-slate-900">{item.stage}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Manager</p>
            <p className="mt-0.5 truncate font-semibold text-slate-900">{item.projectManager}</p>
          </div>
          {item.ministry && (
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Ministry</p>
              <p className="mt-0.5 font-semibold text-rw-blue">{item.ministry}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Next Activity</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{item.nextActivity}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" /> {item.nextActivityDate}
          </div>
        </div>

        <Button variant="outline" className="w-full border-rw-blue/20 text-rw-blue hover:bg-rw-blue/5" onClick={() => onViewDetails(item)}>
          View Investment Details
        </Button>
      </CardContent>
    </Card>
  );
}
