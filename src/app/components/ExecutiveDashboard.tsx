import { type ReactNode } from 'react';
import { Activity, Calendar, Clock, DollarSign, FileText, Shield, TrendingUp, Users } from 'lucide-react';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Panel, PanelHeader, PanelBody } from './layout/PageHeader';
import { DASHBOARD_METRICS, EXECUTIVE_DATA } from '../../data/mockData';

const actionIcons = { urgent: Calendar, warning: FileText, info: Users };

export function ExecutiveDashboard() {
  const exec = EXECUTIVE_DATA;
  const sectors = DASHBOARD_METRICS.sectorAllocation;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl bg-gradient-to-r from-rw-blue-dark via-rw-blue to-rw-blue-dark p-8 text-white shadow-lg">
        <span className="mb-2 inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-rw-yellow">
          Executive Briefing
        </span>
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">Executive Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">
          Portfolio-wide health assessment, critical action items, and entity status matrix for ministerial review.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <HealthCard title="Financial Health" score={exec.portfolioHealth.financial.score} status={exec.portfolioHealth.financial.status} trend={exec.portfolioHealth.financial.trend} icon={<DollarSign className="h-6 w-6" />} color="blue" />
        <HealthCard title="Operational Performance" score={exec.portfolioHealth.operational.score} status={exec.portfolioHealth.operational.status} trend={exec.portfolioHealth.operational.trend} icon={<Activity className="h-6 w-6" />} color="green" />
        <HealthCard title="Governance & Compliance" score={exec.portfolioHealth.governance.score} status={exec.portfolioHealth.governance.status} trend={exec.portfolioHealth.governance.trend} icon={<Shield className="h-6 w-6" />} color="yellow" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Portfolio Financial Trend" description="Revenue and EBITDA in RWF billions" />
          <PanelBody>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={exec.financialTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line dataKey="revenue" stroke="#003DA5" strokeWidth={2.5} name="Revenue (B)" dot={false} />
                <Line dataKey="ebitda" stroke="#00A651" strokeWidth={2.5} name="EBITDA (B)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Sector Allocation" />
          <PanelBody>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sectors} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {sectors.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {sectors.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Actions Required" description="Critical items requiring ministerial attention" />
        <PanelBody className="space-y-3">
          {exec.actionItems.map((item) => {
            const Icon = actionIcons[item.type];
            const styles = {
              urgent: 'border-red-200 bg-red-50',
              warning: 'border-amber-200 bg-amber-50',
              info: 'border-blue-200 bg-blue-50',
            };
            const iconStyles = {
              urgent: 'bg-red-500',
              warning: 'bg-amber-500',
              info: 'bg-rw-blue',
            };
            return (
              <div key={item.title} className={`flex items-start gap-4 rounded-lg border p-4 ${styles[item.type]}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${iconStyles[item.type]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{item.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  <div className="mt-2 flex gap-3 text-xs text-slate-500">
                    <span>{item.company}</span>
                    <span>Due: {item.dueDate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Entity Status Matrix" />
        <PanelBody className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-3 font-semibold">Entity</th>
                <th className="pb-3 text-center font-semibold">Financial</th>
                <th className="pb-3 text-center font-semibold">Operational</th>
                <th className="pb-3 text-center font-semibold">Governance</th>
                <th className="pb-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {exec.companyStatus.map((row) => (
                <tr key={row.name} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="py-3 text-center"><ScoreBadge score={row.financial} /></td>
                  <td className="py-3 text-center"><ScoreBadge score={row.operational} /></td>
                  <td className="py-3 text-center"><ScoreBadge score={row.governance} /></td>
                  <td className="py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${row.status === 'healthy' ? 'bg-rw-green/10 text-rw-green' : 'bg-amber-50 text-amber-700'}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelBody>
      </Panel>
    </div>
  );
}

function HealthCard({ title, score, status, trend, icon, color }: {
  title: string; score: number; status: string; trend: string; icon: ReactNode; color: 'blue' | 'green' | 'yellow';
}) {
  const bg = { blue: 'from-rw-blue to-rw-blue-light', green: 'from-rw-green to-rw-green-dark', yellow: 'from-amber-500 to-amber-400' };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{score}%</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            {trend === 'up' ? <TrendingUp className="h-3.5 w-3.5 text-rw-green" /> : <Clock className="h-3.5 w-3.5" />}
            <span className="capitalize">{status}</span>
          </div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${bg[color]} text-white shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'text-rw-green' : score >= 80 ? 'text-rw-blue' : 'text-amber-600';
  return <span className={`font-semibold ${color}`}>{score}</span>;
}
