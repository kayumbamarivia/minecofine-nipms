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
import { formatRwf } from '../../utils/format';
import { ROLE_SHORT, STATUS_LABELS } from '../../utils/roles';
import type { AuthUser, DashboardSummary, SubmissionStatus } from '../../types';

const SECTOR_COLORS = ['#003DA5', '#00A651', '#FAD201', '#1E40AF', '#7C3AED', '#059669'];

interface DashboardProps {
  user: AuthUser;
  summary: DashboardSummary | null;
}

export function Dashboard({ user, summary }: DashboardProps) {
  const sectorData =
    summary?.sectorAllocation.map((s, i) => ({
      ...s,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      share:
        summary.portfolioValue > 0
          ? Math.round((s.value / summary.portfolioValue) * 1000) / 10
          : 0,
    })) ?? [];

  const statusBars = Object.entries(summary?.submissionsByStatus ?? {}).map(([status, count]) => ({
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
          value={String(summary?.activeCompanies ?? 0)}
          change={`${summary?.totalCompanies ?? 0} in registry`}
          icon={<Briefcase className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Portfolio Value"
          value={formatRwf(summary?.portfolioValue ?? 0, true)}
          change="Government equity exposure"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Pending Submissions"
          value={String(summary?.pendingSubmissions ?? 0)}
          change="Awaiting review or approval"
          changeType="neutral"
          icon={<GitBranch className="h-5 w-5" />}
          accent="yellow"
        />
        <StatCard
          label="Approved Reports"
          value={String(summary?.approvedThisQuarter ?? 0)}
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
              <p className="text-sm text-slate-500">No portfolio data available.</p>
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
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      {s.name} ({s.share}%)
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
              <p className="text-sm text-slate-500">No submissions in the system yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="status"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#003DA5" radius={[4, 4, 0, 0]} name="Submissions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </PanelBody>
        </Panel>
      </div>

      {summary && summary.companies.length > 0 && (
        <Panel>
          <PanelHeader title="Portfolio Entities" description="Registered state-owned enterprises" />
          <PanelBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-semibold">Code</th>
                    <th className="px-5 py-3 font-semibold">Entity</th>
                    <th className="px-5 py-3 font-semibold">Sector</th>
                    <th className="px-5 py-3 font-semibold text-right">Investment</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-rw-blue">{c.code}</td>
                      <td className="px-5 py-3 text-slate-900">{c.name}</td>
                      <td className="px-5 py-3 text-slate-600">{c.sector}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">
                        {formatRwf(c.investmentAmount, true)}
                      </td>
                      <td className="px-5 py-3 capitalize text-slate-600">{c.status.replaceAll('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelBody>
        </Panel>
      )}

      {summary && summary.recentSubmissions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Recent workflow activity
          </p>
          <div className="mt-3 space-y-2">
            {summary.recentSubmissions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-800">{item.title}</span>
                <span className="text-xs text-slate-500">
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
