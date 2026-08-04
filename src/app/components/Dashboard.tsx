import { Briefcase, TrendingUp, Award, GitBranch } from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PageHeader, StatCard, Panel, PanelHeader, PanelBody } from './layout/PageHeader';
import { EmptyState } from './ui/empty-state';
import { PageSkeleton } from './ui/loading-state';
import { StatusBadge } from './ui/status-badge';
import { formatRwf } from '../../utils/format';
import { ROLE_SHORT, STATUS_LABELS } from '../../utils/roles';
import type { AuthUser, DashboardSummary, SubmissionStatus } from '../../types';

const SECTOR_COLORS = ['#003DA5', '#00A651', '#B45309', '#1E40AF', '#0F766E', '#475569'];

interface DashboardProps {
  user: AuthUser;
  summary: DashboardSummary | null;
}

export function Dashboard({ user, summary }: DashboardProps) {
  if (!summary) {
    return <PageSkeleton />;
  }

  const sectorData = summary.sectorAllocation.map((s, i) => ({
    ...s,
    color: SECTOR_COLORS[i % SECTOR_COLORS.length],
    share:
      summary.portfolioValue > 0
        ? Math.round((s.value / summary.portfolioValue) * 1000) / 10
        : 0,
  }));

  const statusBars = Object.entries(summary.submissionsByStatus).map(([status, count]) => ({
    status: STATUS_LABELS[status as SubmissionStatus] ?? status.replaceAll('_', ' '),
    count,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        badge={user.companyName ?? 'MINECOFIN'}
        title="Portfolio Dashboard"
        description={`Overview for ${ROLE_SHORT[user.role]} — registry, submission workflow, and portfolio composition.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active SOEs"
          value={String(summary.activeCompanies)}
          change={`${summary.totalCompanies} in registry`}
          icon={<Briefcase className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Portfolio Value"
          value={formatRwf(summary.portfolioValue, true)}
          change="Government equity exposure"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Pending Submissions"
          value={String(summary.pendingSubmissions)}
          change="Awaiting review or approval"
          changeType="neutral"
          icon={<GitBranch className="h-5 w-5" />}
          accent="yellow"
        />
        <StatCard
          label="Approved Reports"
          value={String(summary.approvedThisQuarter)}
          change="Completed in current cycle"
          icon={<Award className="h-5 w-5" />}
          accent="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Sector Allocation"
            description="Share of portfolio value by sector (from registry)"
          />
          <PanelBody>
            {sectorData.length === 0 ? (
              <EmptyState
                compact
                title="No portfolio data"
                description="Sector allocation will appear once entities are registered with investment values."
              />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={sectorData}
                      dataKey="share"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {sectorData.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {sectorData.map((s) => (
                    <div key={s.name} className="flex items-center gap-2 text-xs text-slate-600">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: s.color }}
                        aria-hidden
                      />
                      <span>
                        {s.name}{' '}
                        <span className="font-medium text-slate-800">({s.share}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Submission Pipeline" description="Counts by workflow status" />
          <PanelBody>
            {statusBars.length === 0 ? (
              <EmptyState
                compact
                title="No submissions yet"
                description="Workflow status counts will appear when packages enter the approval pipeline."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusBars} margin={{ bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="status"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#003DA5" radius={[4, 4, 0, 0]} name="Submissions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </PanelBody>
        </Panel>
      </div>

      {summary.companies.length > 0 && (
        <Panel>
          <PanelHeader title="Portfolio Entities" description="Registered state-owned enterprises" />
          <PanelBody className="p-0">
            <div className="overflow-x-auto">
              <table className="nipms-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Entity</th>
                    <th className="hidden sm:table-cell">Sector</th>
                    <th className="text-right">Investment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.companies.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium text-rw-blue">{c.code}</td>
                      <td className="font-medium text-slate-900">{c.name}</td>
                      <td className="hidden sm:table-cell">{c.sector}</td>
                      <td className="text-right font-medium text-slate-900 tabular-nums">
                        {formatRwf(c.investmentAmount, true)}
                      </td>
                      <td>
                        <StatusBadge status={c.status} kind="entity" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelBody>
        </Panel>
      )}

      {summary.recentSubmissions.length > 0 && (
        <Panel>
          <PanelHeader
            title="Recent Workflow Activity"
            description="Latest submission packages requiring attention or recently updated"
          />
          <PanelBody className="space-y-2 p-4 sm:p-5">
            {summary.recentSubmissions.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.companyName}
                    {item.period ? ` · ${item.period}` : ''}
                  </p>
                </div>
                <StatusBadge status={item.status} kind="submission" className="self-start sm:self-auto" />
              </div>
            ))}
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
