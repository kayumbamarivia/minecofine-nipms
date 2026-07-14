import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  Users,
  Lightbulb,
  ScrollText,
  DollarSign,
  ClipboardCheck,
  Search,
  RefreshCw,
} from 'lucide-react';
import type { Activity } from '../../types';
import { PageHeader } from './layout/PageHeader';

export type { Activity } from '../../types';

interface ActivityListProps {
  activities: Activity[];
  onToggleComplete: (id: string) => void;
  onViewActivity: (activity: Activity) => void;
}

const priorityConfig = {
  low: { color: 'text-slate-600 bg-slate-100 border-slate-200', label: 'Low' },
  medium: { color: 'text-blue-700 bg-blue-50 border-blue-200', label: 'Medium' },
  high: { color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'High' },
  urgent: { color: 'text-red-700 bg-red-50 border-red-200', label: 'Urgent' },
};

const categoryIcons: Record<Activity['category'], typeof Users> = {
  meeting: Users,
  board_appointment: Calendar,
  strategy_development: Lightbulb,
  board_charter: ScrollText,
  funding_decision: DollarSign,
  approval_process: ClipboardCheck,
  review: Search,
  follow_up: RefreshCw,
};

export function ActivityList({ activities, onToggleComplete, onViewActivity }: ActivityListProps) {
  const sortedActivities = [...activities].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const pending = activities.filter((a) => a.status !== 'completed').length;
  const urgent = activities.filter((a) => a.priority === 'urgent' && a.status !== 'completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Task Management"
        title="Activities & Tasks"
        description="Track board appointments, approvals, strategic reviews, and inter-ministerial coordination activities across the portfolio."
      />

      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
          <span className="text-slate-500">Total: </span>
          <span className="font-semibold text-slate-900">{activities.length}</span>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <span className="text-amber-700">Pending: </span>
          <span className="font-semibold text-amber-900">{pending}</span>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm">
          <span className="text-red-700">Urgent: </span>
          <span className="font-semibold text-red-900">{urgent}</span>
        </div>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">No activities found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedActivities.map((activity) => {
            const priorityInfo = priorityConfig[activity.priority];
            const isCompleted = activity.status === 'completed';
            const isOverdue = activity.status !== 'completed' && new Date(activity.dueDate) < new Date();
            const CategoryIcon = categoryIcons[activity.category];

            return (
              <Card
                key={activity.id}
                className={`transition ${isCompleted ? 'opacity-70' : ''} ${isOverdue ? 'border-red-200' : ''}`}
              >
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <Checkbox checked={isCompleted} onCheckedChange={() => onToggleComplete(activity.id)} className="mt-1" />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rw-blue/10 text-rw-blue">
                      <CategoryIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-sm font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {activity.title}
                        </h3>
                        <Badge className={`border text-[10px] ${priorityInfo.color}`}>{priorityInfo.label}</Badge>
                        {isOverdue && (
                          <Badge className="gap-1 border border-red-200 bg-red-50 text-[10px] text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-slate-600">{activity.description}</p>
                      <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {activity.dueDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" /> {activity.assignedTo}
                        </span>
                        <span>{activity.relatedCompany}</span>
                      </div>
                      {isCompleted && activity.completedDate && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-rw-green">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Completed {activity.completedDate}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onViewActivity(activity)}>
                    Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
