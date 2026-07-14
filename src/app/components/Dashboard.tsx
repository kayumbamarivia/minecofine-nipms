import { Briefcase, FileText, TrendingUp, Award } from 'lucide-react';
import { PageHeader, StatCard } from './layout/PageHeader';
import { MetricsDashboard } from './MetricsDashboard';
import { DASHBOARD_METRICS } from '../../data/mockData';
import { formatRwf } from '../../utils/format';

export function Dashboard() {
  const m = DASHBOARD_METRICS;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="MINECOFIN"
        title="Portfolio Dashboard"
        description="Real-time overview of Rwanda's state-owned enterprise investment portfolio, performance metrics, and governance indicators."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Investments"
          value={String(m.activeInvestments)}
          change="+1 this quarter"
          icon={<Briefcase className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Total Portfolio Value"
          value={formatRwf(m.pipelineValue, true)}
          change="+8.2% YoY"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Active Documents"
          value={String(m.activeDocuments)}
          change="+6 pending review"
          changeType="neutral"
          icon={<FileText className="h-5 w-5" />}
          accent="yellow"
        />
        <StatCard
          label="Governance Score"
          value={`${m.portfolioScore}/100`}
          change="+3 pts vs last quarter"
          icon={<Award className="h-5 w-5" />}
          accent="blue"
        />
      </div>

      <MetricsDashboard />
    </div>
  );
}
