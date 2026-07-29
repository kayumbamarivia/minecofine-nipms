import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CornerUpLeft,
  Download,
  Eye,
  FileText,
  MessageSquarePlus,
  Pencil,
  Plus,
  Send,
  AlertCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { PageHeader, Panel, PanelBody } from './layout/PageHeader';
import { documentsApi, submissionsApi } from '../../utils/services';
import { getToken } from '../../utils/api';
import {
  canApproveSubmission,
  canCreateSubmission,
  canEditSubmissionFeedback,
  canReturnSubmission,
  canSubmitSubmission,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../utils/roles';
import type {
  AuthUser,
  StoredDocument,
  Submission,
  SubmissionStatus,
  SubmissionType,
  WorkflowEvent,
} from '../../types';
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

const ACTION_LABELS: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  submitted: 'Submitted',
  approved: 'Approved',
  returned: 'Returned for revision',
  feedback: 'Feedback note',
  feedback_updated: 'Feedback clarified',
};

export function SubmissionsPanel({ user, submissions, onRefresh }: SubmissionsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(submissions[0]?.id ?? null);
  const [returnComment, setReturnComment] = useState('');
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<StoredDocument[]>([]);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<StoredDocument | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [eventsBusy, setEventsBusy] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState('');
  const [editingActiveComment, setEditingActiveComment] = useState(false);
  const [activeCommentDraft, setActiveCommentDraft] = useState('');

  const selected = submissions.find((s) => s.id === selectedId) ?? null;
  const canEditFeedback = canEditSubmissionFeedback(user.role);

  const loadEvents = async (submissionId: string) => {
    setEventsBusy(true);
    try {
      const response = await submissionsApi.events(submissionId);
      setEvents(response.data);
    } catch {
      setEvents([]);
    } finally {
      setEventsBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!selectedId) {
      setAttachments([]);
      setEvents([]);
      setEditingEventId(null);
      setEditingActiveComment(false);
      setFeedbackDraft('');
      return;
    }
    setAttachmentsBusy(true);
    void documentsApi
      .listForSubmission(selectedId)
      .then((response) => {
        if (!cancelled) setAttachments(response.data);
      })
      .catch(() => {
        if (!cancelled) setAttachments([]);
      })
      .finally(() => {
        if (!cancelled) setAttachmentsBusy(false);
      });
    void loadEvents(selectedId);
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (selected?.comments) {
      setActiveCommentDraft(selected.comments);
    } else {
      setActiveCommentDraft('');
      setEditingActiveComment(false);
    }
  }, [selected?.id, selected?.comments]);

  const downloadAttachment = async (document: StoredDocument) => {
    try {
      const token = getToken();
      const response = await fetch(documentsApi.downloadUrl(document.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.originalName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download document');
    }
  };

  const runAction = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      await onRefresh();
      if (selectedId) await loadEvents(selectedId);
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

  const saveEventComment = (eventId: string) =>
    runAction(async () => {
      if (!selectedId) return;
      await submissionsApi.updateEventComment(selectedId, eventId, editingComment.trim());
      setEditingEventId(null);
      setEditingComment('');
    }, 'Feedback comment updated');

  const saveActiveComment = () =>
    runAction(async () => {
      if (!selectedId) return;
      await submissionsApi.updateActiveComment(selectedId, activeCommentDraft.trim());
      setEditingActiveComment(false);
    }, 'Active feedback updated');

  const addFeedbackNote = () =>
    runAction(async () => {
      if (!selectedId) return;
      await submissionsApi.addFeedback(selectedId, feedbackDraft.trim());
      setFeedbackDraft('');
    }, 'Feedback note added');

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

                {(selected.comments || editingActiveComment) && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">Current reviewer feedback</p>
                      {canEditFeedback && !editingActiveComment && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => {
                            setActiveCommentDraft(selected.comments ?? '');
                            setEditingActiveComment(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      )}
                    </div>
                    {editingActiveComment ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={activeCommentDraft}
                          onChange={(e) => setActiveCommentDraft(e.target.value)}
                          rows={4}
                          className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={busy || !activeCommentDraft.trim()}
                            onClick={() => void saveActiveComment()}
                          >
                            Save feedback
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => setEditingActiveComment(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap">{selected.comments}</p>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Review history & feedback
                  </p>
                  {eventsBusy && <p className="mt-3 text-sm text-slate-500">Loading history…</p>}
                  {!eventsBusy && events.length === 0 && (
                    <p className="mt-3 text-sm text-slate-500">No workflow history yet.</p>
                  )}
                  {!eventsBusy && events.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {[...events].reverse().map((event) => {
                        const isEditing = editingEventId === event.id;
                        const canEditThis =
                          canEditFeedback &&
                          ['returned', 'feedback'].includes(event.action) &&
                          Boolean(event.comment);
                        return (
                          <div
                            key={event.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {ACTION_LABELS[event.action] ?? humanizeKey(event.action)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {event.actorName} · {new Date(event.createdAt).toLocaleString()}
                                  {event.fromStatus && event.toStatus
                                    ? ` · ${STATUS_LABELS[event.fromStatus as SubmissionStatus] ?? event.fromStatus} → ${STATUS_LABELS[event.toStatus as SubmissionStatus] ?? event.toStatus}`
                                    : ''}
                                </p>
                              </div>
                              {canEditThis && !isEditing && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => {
                                    setEditingEventId(event.id);
                                    setEditingComment(event.comment ?? '');
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </Button>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={editingComment}
                                  onChange={(e) => setEditingComment(e.target.value)}
                                  rows={3}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    disabled={busy || !editingComment.trim()}
                                    onClick={() => void saveEventComment(event.id)}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => {
                                      setEditingEventId(null);
                                      setEditingComment('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              event.comment && (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                                  {event.comment}
                                </p>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {canEditFeedback && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Add or clarify feedback</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Company approvers, portfolio analysts and Heads of Department can leave notes or
                      adjust existing return comments without waiting for a new return action.
                    </p>
                    <textarea
                      value={feedbackDraft}
                      onChange={(e) => setFeedbackDraft(e.target.value)}
                      rows={3}
                      placeholder="Clarify missing documents, incorrect figures, or required revisions…"
                      className="mt-3 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20"
                    />
                    <Button
                      className="mt-3 gap-2"
                      size="sm"
                      disabled={busy || !feedbackDraft.trim()}
                      onClick={() => void addFeedbackNote()}
                    >
                      <MessageSquarePlus className="h-4 w-4" /> Add feedback note
                    </Button>
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

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Linked supporting documents
                  </p>
                  {attachmentsBusy && (
                    <p className="mt-3 text-sm text-slate-500">Loading documents…</p>
                  )}
                  {!attachmentsBusy && attachments.length === 0 && (
                    <p className="mt-3 text-sm text-slate-500">
                      No files are linked to this submission.
                    </p>
                  )}
                  {!attachmentsBusy && attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((document) => (
                        <div
                          key={document.id}
                          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-rw-blue" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {document.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {document.originalName} · {formatFileSize(document.sizeBytes)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDocument(document)}
                          >
                            <Eye className="h-4 w-4" /> View
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void downloadAttachment(document)}
                          >
                            <Download className="h-4 w-4" /> Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
                    <div className="flex w-full flex-col gap-2">
                      <textarea
                        value={returnComment}
                        onChange={(e) => setReturnComment(e.target.value)}
                        rows={3}
                        placeholder="Explain what must be corrected before resubmission…"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20"
                      />
                      <Button
                        variant="outline"
                        disabled={busy || !returnComment.trim()}
                        className="w-fit gap-2"
                        onClick={() =>
                          runAction(async () => {
                            await submissionsApi.return(selected.id, returnComment.trim());
                            setReturnComment('');
                          }, 'Returned for revision')
                        }
                      >
                        <CornerUpLeft className="h-4 w-4" /> Return for revision
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
      <DocumentPreviewDialog
        document={previewDocument}
        open={previewDocument !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewDocument(null);
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: SubmissionStatus }>) {
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
}: Readonly<{
  label: string;
  value: string;
  accent?: 'amber' | 'green';
}>) {
  let colors = 'border-slate-200 bg-white text-slate-900';
  if (accent === 'amber') colors = 'border-amber-200 bg-amber-50 text-amber-900';
  if (accent === 'green') colors = 'border-green-200 bg-green-50 text-green-900';

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
}: Readonly<{
  role: AuthUser['role'];
  status: SubmissionStatus;
  type: SubmissionType;
}>) {
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
    .replaceAll(/([A-Z])/g, ' $1')
    .replaceAll('_', ' ')
    .replaceAll(/\s+/g, ' ')
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PACK_TEMPLATE_LABELS: Record<string, string> = {
  quarterly_fs_v1: 'MINECOFIN quarterly financial statements v1',
  quarterly_fs_v2: 'MINECOFIN quarterly financial statements v2',
  annual_fs_v1: 'MINECOFIN annual financial statements v1',
};

function PayloadSummary({ payload }: Readonly<{ payload: Record<string, unknown> }>) {
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
  if (payload.cover) {
    pushObjectSection('Cover sheet', payload.cover);
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

  const templateVersion =
    typeof payload.templateVersion === 'string' ? payload.templateVersion : '';

  if (PACK_TEMPLATE_LABELS[templateVersion]) {
    const isAnnual = templateVersion === 'annual_fs_v1';
    const countLines = (map: unknown) =>
      map && typeof map === 'object' ? Object.keys(map as object).length : 0;
    sections.push({
      title: isAnnual ? 'Full annual statement pack' : 'Full quarterly statement pack',
      entries: [
        ['template', PACK_TEMPLATE_LABELS[templateVersion]],
        [
          'trialBalanceAccounts',
          Array.isArray(payload.trialBalance) ? payload.trialBalance.length : 0,
        ],
        ['balanceSheetLines', countLines(payload.balanceSheet)],
        ['incomeStatementLines', countLines(payload.incomeStatement)],
        ['cashFlowLines', countLines(payload.cashFlow)],
        ['equityLines', countLines(payload.changesInEquity)],
        [
          'balanceSheetNotes',
          Array.isArray(payload.balanceSheetNotes) ? payload.balanceSheetNotes.length : 0,
        ],
        [
          'incomeStatementNotes',
          Array.isArray(payload.incomeStatementNotes) ? payload.incomeStatementNotes.length : 0,
        ],
        [
          'operationalKpis',
          Array.isArray(payload.operationalKpis) ? payload.operationalKpis.length : 0,
        ],
        [
          'governanceKpis',
          Array.isArray(payload.governanceKpis) ? payload.governanceKpis.length : 0,
        ],
      ],
    });
  }

  const nestedKeys = new Set([
    'financialStatements',
    'operationalMetrics',
    'governanceMetrics',
    'documentChecklist',
    'ratios',
    'cover',
    'trialBalance',
    'balanceSheet',
    'incomeStatement',
    'cashFlow',
    'changesInEquity',
    'balanceSheetNotes',
    'incomeStatementNotes',
    'financialAnalysisComments',
    'operationalKpis',
    'governanceKpis',
    'attachedDocuments',
    'templateVersion',
  ]);
  const flat = Object.entries(payload).filter(
    ([key, value]) => !nestedKeys.has(key) && value !== null && typeof value !== 'object',
  );
  if (flat.length) sections.push({ title: 'Package details', entries: flat });

  for (const [key, value] of Object.entries(payload)) {
    if (nestedKeys.has(key) || value == null || typeof value !== 'object' || Array.isArray(value)) {
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
