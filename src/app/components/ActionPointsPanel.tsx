import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { StatusBadge } from './ui/status-badge';
import { EmptyState } from './ui/empty-state';
import { LoadingState } from './ui/loading-state';
import { PageHeader, Panel, PanelBody, PanelHeader } from './layout/PageHeader';
import { actionPointsApi } from '../../utils/services';
import type { ActionPoint, ActionPointAssignee, AuthUser } from '../../types';
import { toast } from 'sonner';

interface ActionPointsPanelProps {
  user: AuthUser;
  companies: Array<{ id: string; name: string; code: string }>;
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20';

export function ActionPointsPanel({ user, companies }: Readonly<ActionPointsPanelProps>) {
  const [items, setItems] = useState<ActionPoint[]>([]);
  const [assignees, setAssignees] = useState<ActionPointAssignee[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const canRaise = ['portfolio_analyst', 'department_head', 'leadership'].includes(user.role);

  const [form, setForm] = useState({
    companyId: companies[0]?.id ?? '',
    title: '',
    description: '',
    category: 'financial' as ActionPoint['category'],
    priority: 'medium' as ActionPoint['priority'],
    dueDate: '',
    assignmentType: 'company' as ActionPoint['assignmentType'],
    assignedAnalystId: '',
  });

  const load = async () => {
    const res = await actionPointsApi.list();
    setItems(res.data);
  };

  useEffect(() => {
    void Promise.all([load(), actionPointsApi.assignees().then((res) => setAssignees(res.data))])
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load action points');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.companyId && companies[0]?.id) {
      setForm((prev) => ({ ...prev, companyId: companies[0].id }));
    }
  }, [companies, form.companyId]);

  const create = async () => {
    if (!form.title || !form.companyId) {
      toast.error('Company and title are required');
      return;
    }
    if (form.assignmentType === 'analyst' && !form.assignedAnalystId) {
      toast.error('Select the portfolio analyst who will handle this action');
      return;
    }
    setBusy(true);
    try {
      await actionPointsApi.create(form);
      setForm((prev) => ({ ...prev, title: '', description: '' }));
      await load();
      toast.success('Action point raised');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create action point');
    } finally {
      setBusy(false);
    }
  };

  const assignCompanyPerson = async (id: string, companyAssigneeId: string) => {
    try {
      await actionPointsApi.update(id, { companyAssigneeId });
      await load();
      toast.success('Responsible person assigned');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Assignment failed');
    }
  };

  const setStatus = async (id: string, status: ActionPoint['status']) => {
    try {
      await actionPointsApi.update(id, { status });
      await load();
      toast.success('Action point updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    }
  };

  const canHandle = (item: ActionPoint) =>
    user.role === 'department_head' ||
    user.role === 'leadership' ||
    (user.role === 'portfolio_analyst' &&
      item.assignmentType === 'analyst' &&
      item.assignedAnalystId === user.id) ||
    (Boolean(user.companyId) &&
      item.assignmentType === 'company' &&
      item.companyAssigneeId === user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Business Process 8"
        title="Action Points"
        description="Track issues and follow-ups raised by the portfolio team for companies to address."
      />

      {canRaise && (
        <Panel>
          <PanelHeader title="Raise an action point" />
          <PanelBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Company
                </span>
                <select
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                  className={inputClass}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as ActionPoint['category'] })
                  }
                  className={inputClass}
                >
                  <option value="financial">Financial</option>
                  <option value="operational">Operational</option>
                  <option value="governance">Governance</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Title
                </span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Description / query
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Priority
                </span>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value as ActionPoint['priority'] })
                  }
                  className={inputClass}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Due date
                </span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Assign action to
                </span>
                <select
                  value={form.assignmentType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      assignmentType: e.target.value as ActionPoint['assignmentType'],
                      assignedAnalystId: '',
                    })
                  }
                  className={inputClass}
                >
                  <option value="company">Company</option>
                  <option value="analyst">Portfolio analyst</option>
                </select>
              </label>
              {form.assignmentType === 'analyst' ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Responsible analyst
                  </span>
                  <select
                    value={form.assignedAnalystId}
                    onChange={(e) => setForm({ ...form, assignedAnalystId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select analyst</option>
                    {assignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.fullName}
                        {assignee.title ? ` — ${assignee.title}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  The company will select a registered staff member to take responsibility.
                </div>
              )}
            </div>
            <Button disabled={busy} onClick={() => void create()}>
              Raise action point
            </Button>
          </PanelBody>
        </Panel>
      )}

      {loading ? (
        <Panel>
          <PanelBody>
            <LoadingState label="Loading action points…" />
          </PanelBody>
        </Panel>
      ) : items.length === 0 ? (
        <Panel>
          <EmptyState
            title="No action points yet"
            description="Raised follow-ups and company assignments will appear in this list."
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Panel key={item.id}>
              <PanelBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.companyName} · {item.category} · {item.priority} · raised by{' '}
                      {item.raisedByName}
                    </p>
                    <p className="mt-1 text-xs font-medium text-rw-blue">
                      {getAssignmentLabel(item)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} kind="generic" />
                </div>
                {item.description && (
                  <p className="text-sm text-slate-700">{item.description}</p>
                )}
                {Boolean(user.companyId) && item.assignmentType === 'company' && (
                  <label className="block max-w-sm text-sm">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Company person responsible
                    </span>
                    <select
                      value={item.companyAssigneeId ?? ''}
                      onChange={(e) => void assignCompanyPerson(item.id, e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select person</option>
                      {assignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>
                          {assignee.fullName}
                          {assignee.title ? ` — ${assignee.title}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {canHandle(item) && (
                  <div className="flex flex-wrap gap-2">
                    {item.status !== 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void setStatus(item.id, 'in_progress')}
                      >
                        Mark in progress
                      </Button>
                    )}
                    {item.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => void setStatus(item.id, 'resolved')}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                )}
              </PanelBody>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function getAssignmentLabel(item: ActionPoint) {
  if (item.assignmentType === 'analyst') {
    return `Assigned to analyst: ${item.assignedAnalystName ?? 'Not selected'}`;
  }
  if (item.companyAssigneeName) {
    return `Assigned to company · Handler: ${item.companyAssigneeName}`;
  }
  return 'Assigned to company · Handler not yet selected';
}
