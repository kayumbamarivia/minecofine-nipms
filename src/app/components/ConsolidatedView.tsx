import { Download, Filter } from 'lucide-react';
import {
  BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
} from 'recharts';
import { PageHeader, StatCard, Panel, PanelHeader, PanelBody } from './layout/PageHeader';
import { Button } from './ui/button';
import { CONSOLIDATED_DATA } from '../../data/mockData';

const chartTooltipStyle = {
  contentStyle: { borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' },
};

export function ConsolidatedView() {
  const data = CONSOLIDATED_DATA;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Analytics"
        title="Portfolio Consolidated View"
        description="Aggregated financial performance, sector benchmarks, and cross-entity comparison across all state-owned enterprise investments."
        actions={
          <>
            <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> Filter</Button>
            <Button className="gap-2"><Download className="h-4 w-4" /> Export Report</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Portfolio Revenue" value="RWF 23.5B" change="+8.8% YoY" accent="blue" />
        <StatCard label="Avg Revenue Growth" value="14.0%" change="+1.8% vs benchmark" accent="green" />
        <StatCard label="Portfolio EBITDA" value="RWF 6.8B" change="+11.2% YoY" accent="blue" />
        <StatCard label="Avg Gross Margin" value="27.4%" change="+1.2% vs benchmark" accent="yellow" />
      </div>

      <Panel>
        <PanelHeader title="Consolidated Revenue Trend" description="Quarterly revenue by portfolio entity (RWF millions)" />
        <PanelBody>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.revenueByQuarter}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="quarter" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="reg" stackId="a" fill="#003DA5" name="REG" radius={[0, 0, 0, 0]} />
              <Bar dataKey="rwandair" stackId="a" fill="#00A651" name="RwandAir" />
              <Bar dataKey="wasac" stackId="a" fill="#FAD201" name="WASAC" />
              <Bar dataKey="brd" stackId="a" fill="#1E40AF" name="BRD" />
              <Bar dataKey="risa" stackId="a" fill="#7C3AED" name="RISA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PanelBody>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Performance vs Benchmark" description="Portfolio average against national SOE benchmarks" />
          <PanelBody>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={data.performanceMetrics}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar name="Portfolio" dataKey="avgScore" stroke="#003DA5" fill="#003DA5" fillOpacity={0.4} />
                <Radar name="Benchmark" dataKey="benchmark" stroke="#00A651" fill="#00A651" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Entity Performance Comparison" />
          <PanelBody className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 font-semibold">Entity</th>
                  <th className="pb-3 text-right font-semibold">Revenue (M)</th>
                  <th className="pb-3 text-right font-semibold">Growth</th>
                  <th className="pb-3 text-right font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.companyComparison.map((row) => (
                  <tr key={row.company} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-900">{row.company}</td>
                    <td className="py-3 text-right text-slate-700">{row.revenue.toLocaleString()}</td>
                    <td className="py-3 text-right font-medium text-rw-green">{row.growth}%</td>
                    <td className="py-3 text-right text-slate-700">{row.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
