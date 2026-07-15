import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CornerUpLeft,
  Plus,
  Send,
  AlertCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PageHeader, Panel, PanelBody } from './layout/PageHeader';
import { submissionsApi } from '../../utils/services';
import {
  canApproveSubmission,
  canCreateSubmission,
  canReturnSubmission,
  canSubmitSubmission,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../utils/roles';
import type { AuthUser, Submission, SubmissionStatus, SubmissionType } from '../../types';
import { toast } from 'sonner';

interface SubmissionsPanelProps {
  user: AuthUser;
  submissions: Submission[];
  onRefresh: () => Promise<void>;
}

const TYPE_LABELS: Record<SubmissionType, string> = {
  soe_creation: 'SOE Creation',
  profile_update: 'Profile Update',
  planning_budgeting: 'Planning & Budgeting',
  quarterly_report: 'Quarterly Report',
  annual_report: 'Annual Report',
};

export function SubmissionsPanel({ user, submissions, onRefresh }: SubmissionsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(submissions[0]?.id ?? null);
  const [returnComment, setReturnComment] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  const runAction = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      await onRefresh();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateQuarterly = () =>
    runAction(async () => {
      const created = await submissionsApi.create({
        type: 'quarterly_report',
        title: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()} Quarterly Report`,
        period: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
        payload: {
          revenue: 0,
          ebitda: 0,
          governanceScore: 0,
          notes: 'Draft created — complete financial statement fields before submission.',
        },
      });
      setSelectedId(created.data.id);
    }, 'Draft quarterly report created');

  const pending = submissions.filter((s) => s.status !== 'approved' && s.status !== 'draft').length;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Workflow"
        title="Submissions & Approvals"
        description="Official review chain: company submission → company approval → ministry analysis → department approval → leadership reporting."
        actions={
          canCreateSubmission(user.role) ? (
            <Button onClick={handleCreateQuarterly} disabled={busy} className="gap-2">
              <Plus className="h-4 w-4" /> New Quarterly Draft
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Submissions" value={String(submissions.length)} />
        <Stat label="Awaiting Action" value={String(pending)} accent="amber" />
        <Stat
          label="Approved"
          value={String(submissions.filter((s) => s.status === 'approved').length)}
          accent="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <PanelBody className="p-0">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inbox</p>
            </div>
            <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
              {submissions.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-500">No submissions yet.</p>
              )}
              {submissions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full px-4 py-4 text-left transition hover:bg-slate-50 ${
                    selectedId === item.id ? 'bg-rw-blue/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.companyCode} · {TYPE_LABELS[item.type]}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                </button>
              ))}
            </div>
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelBody>
            {!selected ? (
              <p className="text-sm text-slate-500">Select a submission to review.</p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{selected.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selected.companyName} · {selected.period ?? 'No period'} ·{' '}
                      {TYPE_LABELS[selected.type]}
                    </p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                {selected.comments && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-semibold">Reviewer comment</p>
                    <p className="mt-1">{selected.comments}</p>
                  </div>
                )}

                {selected.payload?.ratios && typeof selected.payload.ratios === 'object' && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Computed financial ratios
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {Object.entries(selected.payload.ratios as Record<string, unknown>)
                        .filter(([key]) => key !== 'redFlags')
                        .map(([key, value]) => (
                          <div key={key} className="rounded-md bg-white px-3 py-2 text-xs">
                            <span className="text-slate-500">{humanizeKey(key)}</span>
                            <p className="font-semibold text-slate-900">
                              {formatPayloadValue(key, value)}
                            </p>
                          </div>
                        ))}
                    </div>
                    {Array.isArray((selected.payload.ratios as { redFlags?: string[] }).redFlags) &&
                      (selected.payload.ratios as { redFlags: string[] }).redFlags.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-red-700">
                          {(selected.payload.ratios as { redFlags: string[] }).redFlags.map((flag) => (
                            <li key={flag}>{flag}</li>
                          ))}
                        </ul>
                      )}
                  </div>
                )}

                <PayloadSummary payload={selected.payload ?? {}} />

                <div className="flex flex-wrap gap-2">
                  {canSubmitSubmission(user.role, selected.status, selected.type) && (
                    <Button
                      disabled={busy}
                      className="gap-2"
                      onClick={() =>
                        runAction(async () => {
                          await submissionsApi.submit(selected.id);
                        }, 'Submitted for company approval')
                      }
                    >
                      <Send className="h-4 w-4" /> Submit
                    </Button>
                  )}
                  {canApproveSubmission(user.role, selected.status) && (
                    <Button
                      disabled={busy}
                      className="gap-2"
                      onClick={() =>
                        runAction(async () => {
                          await submissionsApi.approve(selected.id);
                        }, 'Submission approved')
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                  )}
                  {canReturnSubmission(user.role, selected.status) && (
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={returnComment}
                        onChange={(e) => setReturnComment(e.target.value)}
                        placeholder="Comment required to return for revision..."
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20"
                      />
                      <Button
                        variant="outline"
                        disabled={busy || !returnComment.trim()}
                        className="gap-2"
                        onClick={() =>
                          runAction(async () => {
                            await submissionsApi.return(selected.id, returnComment.trim());
                            setReturnComment('');
                          }, 'Returned to company for revision')
                        }
                      >
                        <CornerUpLeft className="h-4 w-4" /> Return
                      </Button>
                    </div>
                  )}
                </div>

                <WorkflowHint role={user.role} status={selected.status} type={selected.type} />
              </div>
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge variant="outline" className={`shrink-0 text-[10px] ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'amber' | 'green';
}) {
  const colors =
    accent === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : accent === 'green'
        ? 'border-green-200 bg-green-50 text-green-900'
        : 'border-slate-200 bg-white text-slate-900';

  return (
    <div className={`rounded-xl border px-4 py-3 ${colors}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function WorkflowHint({
  role,
  status,
  type,
}: {
  role: AuthUser['role'];
  status: SubmissionStatus;
  type: SubmissionType;
}) {
  const hints: Partial<Record<SubmissionStatus, string>> = {
    draft: 'Complete the package, then submit into the review chain.',
    pending_company_approval:
      'The company approver (CEO or Board) reviews before the package reaches the Ministry.',
    pending_ministry_review:
      'The portfolio analyst validates completeness, benchmarks, and analytical quality.',
    pending_department_approval:
      'The Head of Department provides final ministry approval before reports are considered final.',
    approved: 'Approved data feeds leadership dashboards and the company registry where applicable.',
    returned: 'The submitter must revise and resubmit after addressing reviewer comments.',
  };

  const action =
    canSubmitSubmission(role, status, type) ||
    canApproveSubmission(role, status) ||
    canReturnSubmission(role, status);

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
      {action ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rw-blue" />
      ) : (
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      )}
      <div>
        <p className="font-medium text-slate-800">
          {action ? 'Action required from your role' : 'Waiting on another step'}
        </p>
        <p className="mt-1">{hints[status]}</p>
      </div>
    </div>
  );
}

function humanizeKey(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function formatPayloadValue(key: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (/pct|percent|margin|ratio|score/i.test(key)) return String(value);
    if (Math.abs(value) >= 1000) return value.toLocaleString('en-RW');
    return String(value);
  }
  if (Array.isArray(value)) return value.map(String).join(', ') || '—';
  if (typeof value === 'object') return '—';
  return String(value);
}

function PayloadSummary({ payload }: { payload: Record<string, unknown> }) {
  const sections: Array<{ title: string; entries: Array<[string, unknown]> }> = [];

  const pushObjectSection = (title: string, value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== null && typeof v !== 'object',
    );
    if (entries.length) sections.push({ title, entries });
  };

  if (payload.financialStatements) {
    pushObjectSection('Financial statements', payload.financialStatements);
  }
  if (payload.operationalMetrics) {
    pushObjectSection('Operational metrics', payload.operationalMetrics);
  }
  if (payload.governanceMetrics) {
    pushObjectSection('Governance metrics', payload.governanceMetrics);
  }
  if (payload.documentChecklist) {
    pushObjectSection('Document checklist', payload.documentChecklist);
  }

  // Flat / legacy payloads and other process types
  const nestedKeys = new Set([
    'financialStatements',
    'operationalMetrics',
    'governanceMetrics',
    'documentChecklist',
    'ratios',
  ]);
  const flat = Object.entries(payload).filter(
    ([key, value]) => !nestedKeys.has(key) && value !== null && typeof value !== 'object',
  );
  if (flat.length) sections.push({ title: 'Package details', entries: flat });

  // Nested profile / SOE objects that aren't arrays
  for (const [key, value] of Object.entries(payload)) {
    if (nestedKeys.has(key) || value == null || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    if (
      [
        'financialStatements',
        'operationalMetrics',
        'governanceMetrics',
        'documentChecklist',
      ].includes(key)
    ) {
      continue;
    }
    pushObjectSection(humanizeKey(key), value);
  }

  if (sections.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No structured package data yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {section.title}
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {section.entries.map(([key, value]) => (
              <div key={key} className="rounded-md bg-white px-3 py-2 text-xs">
                <dt className="text-slate-500">{humanizeKey(key)}</dt>
                <dd className="font-semibold text-slate-900">{formatPayloadValue(key, value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
