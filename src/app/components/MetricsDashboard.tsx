import {
  LineChart,
  Line,
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
  Legend,
} from 'recharts';
import { Panel, PanelHeader, PanelBody } from './layout/PageHeader';
import { DASHBOARD_METRICS } from '../../data/mockData';

const chartTooltipStyle = {
  contentStyle: {
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    fontSize: '12px',
  },
};

export function MetricsDashboard() {
  const m = DASHBOARD_METRICS;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Portfolio Value Trend"
            description="Aggregate portfolio value in billions RWF — trailing 6 months"
          />
          <PanelBody>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={m.portfolioValueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} unit="B" />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [`RWF ${value}B`, 'Portfolio Value']} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#003DA5"
                    strokeWidth={2.5}
                    dot={{ fill: '#003DA5', r: 4 }}
                    activeDot={{ r: 6, fill: '#FAD201' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Sector Allocation" description="Portfolio distribution by sector" />
          <PanelBody>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={m.sectorAllocation}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {m.sectorAllocation.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [`${value}%`, 'Allocation']} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Capital Flow Analysis"
            description="Monthly investment inflows vs disbursements (RWF billions)"
          />
          <PanelBody>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.cashFlowTrend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltipStyle} />
                  <Bar dataKey="inflow" fill="#00A651" name="Inflows" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" fill="#003DA5" name="Outflows" radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Top Performing Investments" description="Key performance indicators by entity" />
          <PanelBody className="space-y-3">
            {m.topPerformers.map((item, index) => (
              <div
                key={item.company}
                className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rw-blue text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.company}</p>
                  <p className="text-xs text-slate-500">{item.metric}</p>
                </div>
                <p className="text-lg font-bold text-rw-green">{item.value}</p>
              </div>
            ))}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
