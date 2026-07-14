import { Building2, Link2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { PageHeader, Panel, PanelHeader, PanelBody, StatCard } from './layout/PageHeader';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MINISTRY_PARTNERS } from '../../data/mockData';

export function InterMinisterialPanel() {
  const connected = MINISTRY_PARTNERS.filter((m) => m.status === 'connected').length;
  const totalCollaborations = MINISTRY_PARTNERS.reduce((sum, m) => sum + m.activeCollaborations, 0);
  const totalPending = MINISTRY_PARTNERS.reduce((sum, m) => sum + m.pendingApprovals, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Cross-Government"
        title="Inter-Ministerial Collaboration Hub"
        description="Coordinate investment approvals, share portfolio data, and manage cross-ministry workflows with partner institutions across the Government of Rwanda."
        actions={
          <Button className="gap-2">
            <Link2 className="h-4 w-4" /> Request Ministry Access
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Connected Ministries" value={String(connected)} accent="blue" icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Active Collaborations" value={String(totalCollaborations)} change="+4 this month" accent="green" icon={<Link2 className="h-5 w-5" />} />
        <StatCard label="Pending Approvals" value={String(totalPending)} changeType="neutral" accent="yellow" icon={<Clock className="h-5 w-5" />} />
      </div>

      <Panel>
        <PanelHeader
          title="Partner Ministries"
          description="Government institutions connected to the National Investment Portfolio Management System"
        />
        <PanelBody>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MINISTRY_PARTNERS.map((ministry) => (
              <div
                key={ministry.id}
                className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-rw-blue/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rw-blue text-sm font-bold text-white">
                      {ministry.acronym.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-rw-blue">{ministry.acronym}</p>
                      <StatusBadge status={ministry.status} />
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">{ministry.name}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                    <p className="text-lg font-bold text-slate-900">{ministry.activeCollaborations}</p>
                    <p className="text-[10px] text-slate-500">Collaborations</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                    <p className="text-lg font-bold text-amber-600">{ministry.pendingApprovals}</p>
                    <p className="text-[10px] text-slate-500">Pending</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-slate-400">Last sync: {ministry.lastSync}</p>
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Recent Cross-Ministry Activities" description="Latest inter-ministerial coordination events" />
        <PanelBody className="space-y-3">
          {[
            { ministry: 'MININFRA', action: 'Co-signed WASAC rural water programme funding approval', date: '30 Jun 2026', status: 'completed' },
            { ministry: 'MINICT', action: 'Joint review of RISA National Data Centre investment memo', date: '28 Jun 2026', status: 'in_progress' },
            { ministry: 'MINALOC', action: 'District-level water access coordination for Eastern Province', date: '27 Jun 2026', status: 'pending' },
            { ministry: 'MINICOM', action: 'BRD SME lending programme trade sector alignment review', date: '25 Jun 2026', status: 'completed' },
          ].map((item) => (
            <div key={item.action} className="flex items-center gap-4 rounded-lg border border-slate-100 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rw-blue/10 text-xs font-bold text-rw-blue">
                {item.ministry.slice(0, 3)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{item.action}</p>
                <p className="text-xs text-slate-500">{item.ministry} — {item.date}</p>
              </div>
              <Badge
                className={
                  item.status === 'completed'
                    ? 'bg-rw-green/10 text-rw-green'
                    : item.status === 'in_progress'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-amber-50 text-amber-700'
                }
              >
                {item.status === 'completed' ? 'Completed' : item.status === 'in_progress' ? 'In Progress' : 'Pending'}
              </Badge>
            </div>
          ))}
        </PanelBody>
      </Panel>
    </div>
  );
}

function StatusBadge({ status }: { status: 'connected' | 'pending' | 'offline' }) {
  if (status === 'connected') {
    return (
      <Badge className="mt-0.5 gap-1 bg-rw-green/10 text-[10px] text-rw-green">
        <CheckCircle className="h-3 w-3" /> Connected
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge className="mt-0.5 gap-1 bg-amber-50 text-[10px] text-amber-700">
        <Clock className="h-3 w-3" /> Pending
      </Badge>
    );
  }
  return (
    <Badge className="mt-0.5 gap-1 bg-slate-100 text-[10px] text-slate-500">
      <AlertCircle className="h-3 w-3" /> Offline
    </Badge>
  );
}
