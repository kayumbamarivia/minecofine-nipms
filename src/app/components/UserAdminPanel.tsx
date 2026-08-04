import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { StatusBadge } from './ui/status-badge';
import { EmptyState } from './ui/empty-state';
import { LoadingState } from './ui/loading-state';
import { PageHeader, Panel, PanelBody, PanelHeader } from './layout/PageHeader';
import { usersApi } from '../../utils/services';
import { ROLE_LABELS } from '../../utils/roles';
import type { AuthUser, ManagedUser, UserRole } from '../../types';
import { toast } from 'sonner';

interface UserAdminPanelProps {
  user: AuthUser;
  companies: Array<{ id: string; name: string; code: string }>;
}

const ROLE_OPTIONS: UserRole[] = [
  'company_submitter',
  'company_approver',
  'portfolio_analyst',
  'department_head',
  'leadership',
];

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20';

export function UserAdminPanel({ user, companies }: UserAdminPanelProps) {
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    title: '',
    role: 'company_submitter' as UserRole,
    companyId: companies[0]?.id ?? '',
  });

  const load = async () => {
    const res = await usersApi.list();
    setRows(res.data);
  };

  useEffect(() => {
    void load()
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load users');
      })
      .finally(() => setLoading(false));
  }, []);

  const createUser = async () => {
    setBusy(true);
    try {
      const res = await usersApi.create({
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        title: form.title.trim(),
        role: form.role,
        companyId: ['company_submitter', 'company_approver'].includes(form.role)
          ? form.companyId
          : null,
      });
      toast.success(res.message);
      if (res.invite?.temporaryPassword) {
        toast.message(`Temporary password (local only): ${res.invite.temporaryPassword}`);
      }
      setForm((prev) => ({ ...prev, email: '', fullName: '', title: '' }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create user');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row: ManagedUser) => {
    try {
      await usersApi.update(row.id, { isActive: !row.isActive });
      await load();
      toast.success(row.isActive ? 'Account deactivated' : 'Account reactivated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    }
  };

  const resend = async (id: string) => {
    try {
      const res = await usersApi.resendInvite(id);
      toast.success(res.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Resend failed');
    }
  };

  const canAssignSenior = user.role === 'department_head' || user.role === 'leadership';

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Administration"
        title="User Administration"
        description="Provision authorised NIPMS accounts. There is no public signup — users verify email and must replace temporary passwords."
      />

      <Panel>
        <PanelHeader title="Create account" />
        <PanelBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Full name
              </span>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Official email
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Title
              </span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Role
              </span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className={inputClass}
              >
                {ROLE_OPTIONS.filter((role) => {
                  if (role === 'leadership' || role === 'department_head') return canAssignSenior;
                  return true;
                }).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            {['company_submitter', 'company_approver'].includes(form.role) && (
              <label className="block text-sm sm:col-span-2">
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
            )}
          </div>
          <Button
            disabled={busy || !form.email || !form.fullName}
            onClick={() => void createUser()}
          >
            Create & send invite
          </Button>
        </PanelBody>
      </Panel>

      <Panel className="overflow-hidden">
        {loading ? (
          <PanelBody>
            <LoadingState label="Loading users…" />
          </PanelBody>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No users yet"
            description="Provisioned NIPMS accounts will appear in this directory."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="nipms-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <p className="font-medium text-slate-900">{row.fullName}</p>
                      <p className="text-xs text-slate-500">{row.email}</p>
                    </td>
                    <td>{ROLE_LABELS[row.role]}</td>
                    <td>{row.companyName || '— Ministry'}</td>
                    <td>
                      <div className="flex flex-col items-start gap-1.5">
                        <StatusBadge
                          status={row.isActive ? 'active' : 'inactive'}
                          kind="entity"
                        />
                        <span
                          className={`text-xs ${row.emailVerified ? 'text-slate-500' : 'text-amber-700'}`}
                        >
                          {row.emailVerified ? 'Email verified' : 'Pending verification'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        {!row.emailVerified && (
                          <Button size="sm" variant="outline" onClick={() => void resend(row.id)}>
                            Resend invite
                          </Button>
                        )}
                        {row.id !== user.id && (
                          <Button
                            size="sm"
                            variant={row.isActive ? 'outline' : 'success'}
                            onClick={() => void toggleActive(row)}
                          >
                            {row.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
