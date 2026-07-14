import { Zap, Plane, Droplets, MapPin, ArrowRight } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader, Panel, PanelHeader, PanelBody } from './layout/PageHeader';
import { OPERATIONS_DATA } from '../../data/mockData';

export function OperationalDashboard() {
  const ops = OPERATIONS_DATA;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Operations"
        title="Operations Dashboard"
        description="Real-time operational performance metrics across energy, aviation, and water portfolio entities."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Energy Operations — REG"
            description="Rwanda Energy Group key performance indicators"
            actions={<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Zap className="h-5 w-5" /></div>}
          />
          <PanelBody>
            <div className="grid gap-3 sm:grid-cols-2">
              {ops.energy.map((metric) => (
                <MetricTile key={metric.metric} {...metric} />
              ))}
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Aviation Operations — RwandAir"
            description="Fleet and route performance metrics"
            actions={<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rw-blue/10 text-rw-blue"><Plane className="h-5 w-5" /></div>}
          />
          <PanelBody>
            <div className="grid gap-3 sm:grid-cols-2">
              {ops.aviation.map((metric) => (
                <MetricTile key={metric.metric} {...metric} />
              ))}
            </div>
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Route Performance</p>
              {ops.routes.map((route) => (
                <div key={`${route.from}-${route.to}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-800">
                      <MapPin className="h-3.5 w-3.5 text-rw-blue" />
                      <span>{route.from}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      <span>{route.to}</span>
                    </div>
                    <span className="text-xs text-slate-500">{route.flights} flights/wk</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${route.load >= 80 ? 'bg-rw-green' : 'bg-amber-500'}`}
                        style={{ width: `${route.load}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold">{route.load}%</span>
                  </div>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Water Infrastructure — WASAC"
          description="Rural and urban water access programme coverage"
          actions={<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Droplets className="h-5 w-5" /></div>}
        />
        <PanelBody>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              {ops.waterProjects.map((project) => (
                <div key={project.project} className="rounded-lg border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{project.project}</p>
                    <span className="text-sm font-bold text-rw-blue">{project.coverage}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-rw-blue"
                      style={{ width: `${(project.coverage / project.target) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Target: {project.target}%</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ops.waterProjects}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="project" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="coverage" fill="#003DA5" name="Coverage %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="#00A651" name="Target %" radius={[4, 4, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}

function MetricTile({ metric, value, target, unit }: { metric: string; value: number; target: number; unit: string }) {
  const onTarget = value >= target;
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{metric}</p>
      <p className="mt-1.5 text-xl font-bold text-slate-900">{value}{unit}</p>
      <p className={`mt-1 text-[10px] font-medium ${onTarget ? 'text-rw-green' : 'text-amber-600'}`}>
        Target: {target}{unit} {onTarget ? '✓' : '— below target'}
      </p>
    </div>
  );
}
