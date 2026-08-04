import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { PageHeader, Panel, PanelBody, PanelHeader } from './layout/PageHeader';
import { PerformanceContractForm } from './PerformanceContractForm';
import { QuarterlyReportForm } from './QuarterlyReportForm';
import { AnnualReportForm } from './AnnualReportForm';
import { SupportingFileField } from './SupportingFileField';
import { companiesApi, documentsApi, submissionsApi } from '../../utils/services';
import { canCreateSubmission, isCompanyRole } from '../../utils/roles';
import type { AuthUser, StoredDocumentCategory, SubmissionType } from '../../types';
import { toast } from 'sonner';

interface ProcessWorkspaceProps {
  user: AuthUser;
  companies: Array<{ id: string; name: string; code: string; sector?: string }>;
  onCreated: () => Promise<void>;
}

type ProcessTab =
  | 'soe_creation'
  | 'profile_update'
  | 'planning_budgeting'
  | 'quarterly_report'
  | 'annual_report';

export function ProcessWorkspace({ user, companies, onCreated }: ProcessWorkspaceProps) {
  const tabs: Array<{ key: ProcessTab; label: string; show: boolean }> = [
    {
      key: 'soe_creation',
      label: 'Create SOE',
      show: user.role === 'portfolio_analyst',
    },
    {
      key: 'profile_update',
      label: 'Update Profile',
      show: canCreateSubmission(user.role),
    },
    {
      key: 'planning_budgeting',
      label: 'Planning & Budgeting',
      show: isCompanyRole(user.role) || user.role === 'portfolio_analyst',
    },
    {
      key: 'quarterly_report',
      label: 'Quarterly Report',
      show: isCompanyRole(user.role) || user.role === 'portfolio_analyst',
    },
    {
      key: 'annual_report',
      label: 'Annual Report',
      show: isCompanyRole(user.role) || user.role === 'portfolio_analyst',
    },
  ];

  const visible = tabs.filter((t) => t.show);
  const [active, setActive] = useState<ProcessTab>(visible[0]?.key ?? 'quarterly_report');
  const [busy, setBusy] = useState(false);

  const defaultCompanyId = user.companyId ?? companies[0]?.id ?? '';

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Business Processes"
        title="Submission Workspace"
        description="Prepare packages for the official approval chain — SOE creation, profile updates, planning & budgeting, quarterly and annual reports."
      />

      <div
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xs"
        role="tablist"
        aria-label="Submission workspace processes"
      >
        {visible.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              active === tab.key
                ? 'bg-rw-blue text-white'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'soe_creation' && (
        <SoeCreationForm busy={busy} setBusy={setBusy} onCreated={onCreated} />
      )}
      {active === 'profile_update' && (
        <ProfileUpdateForm
          user={user}
          companies={companies}
          defaultCompanyId={defaultCompanyId}
          busy={busy}
          setBusy={setBusy}
          onCreated={onCreated}
        />
      )}
      {active === 'planning_budgeting' && (
        <PerformanceContractForm
          user={user}
          companies={companies}
          defaultCompanyId={defaultCompanyId}
          busy={busy}
          setBusy={setBusy}
          onCreated={onCreated}
        />
      )}
      {active === 'quarterly_report' && (
        <QuarterlyReportForm
          user={user}
          companies={companies}
          defaultCompanyId={defaultCompanyId}
          busy={busy}
          setBusy={setBusy}
          onCreated={onCreated}
        />
      )}
      {active === 'annual_report' && (
        <AnnualReportForm
          user={user}
          companies={companies}
          defaultCompanyId={defaultCompanyId}
          busy={busy}
          setBusy={setBusy}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

async function createAndToast(
  body: {
    companyId?: string;
    type: SubmissionType;
    title: string;
    period?: string;
    payload?: Record<string, unknown>;
  },
  onCreated: () => Promise<void>,
  setBusy: (v: boolean) => void,
) {
  setBusy(true);
  try {
    await submissionsApi.create(body);
    await onCreated();
    toast.success('Draft saved — open Submissions & Approvals to submit into the review chain');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Unable to create draft');
  } finally {
    setBusy(false);
  }
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
      />
    </label>
  );
}

function SoeCreationForm({
  busy,
  setBusy,
  onCreated,
}: {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    sector: '',
    establishedDate: '',
    location: '',
    province: '',
    ministry: 'MINECOFIN',
    description: '',
    ceoName: '',
    cfoName: '',
    boardChair: '',
    investmentAmount: '0',
    ownershipPct: '100',
  });
  const [supportingFiles, setSupportingFiles] = useState({
    businessCase: null as File | null,
    businessPlan: null as File | null,
    registrationCertificate: null as File | null,
    shareholderAgreement: null as File | null,
    articlesOfAssociation: null as File | null,
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const allDocumentsSelected = Object.values(supportingFiles).every(Boolean);

  const save = async () => {
    if (!allDocumentsSelected) {
      toast.error('Select all required registration documents before saving');
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        investmentAmount: Number(form.investmentAmount),
        ownershipPct: Number(form.ownershipPct),
      };
      const created = await submissionsApi.create({
        type: 'soe_creation',
        title: `SOE Registration — ${form.name || form.code}`,
        payload,
      });
      const files: Array<{
        file: File;
        name: string;
        category: StoredDocumentCategory;
      }> = [
        {
          file: supportingFiles.businessCase!,
          name: 'Business case',
          category: 'business_case',
        },
        {
          file: supportingFiles.businessPlan!,
          name: 'Business plan / strategy',
          category: 'business_plan',
        },
        {
          file: supportingFiles.registrationCertificate!,
          name: 'Registration certificate',
          category: 'registration_certificate',
        },
        {
          file: supportingFiles.shareholderAgreement!,
          name: 'Shareholder agreement',
          category: 'shareholder_agreement',
        },
        {
          file: supportingFiles.articlesOfAssociation!,
          name: 'Articles of association',
          category: 'articles_of_association',
        },
      ];
      const uploadedDocuments = await Promise.all(
        files.map(async (item) => {
          const uploadForm = new FormData();
          uploadForm.append('file', item.file);
          uploadForm.append('companyId', created.data.companyId);
          uploadForm.append('submissionId', created.data.id);
          uploadForm.append('name', item.name);
          uploadForm.append('category', item.category);
          return (await documentsApi.upload(uploadForm)).data;
        }),
      );
      await submissionsApi.update(created.data.id, {
        payload: {
          ...payload,
          attachments: uploadedDocuments.map((document) => ({
            id: document.id,
            name: document.name,
            originalName: document.originalName,
            category: document.category,
            sizeBytes: document.sizeBytes,
          })),
        },
      });
      await onCreated();
      toast.success('SOE creation draft saved with all registration documents');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save SOE creation draft');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Business Process 1 — Create a new SOE"
        description="Portfolio analyst initiates registration. Head of Department approves before the entity becomes active in the registry."
      />
      <PanelBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company code" value={form.code} onChange={(v) => set('code', v.toUpperCase())} />
          <Field label="Company name" value={form.name} onChange={(v) => set('name', v)} />
          <Field label="Sector" value={form.sector} onChange={(v) => set('sector', v)} />
          <Field label="Date of establishment" value={form.establishedDate} onChange={(v) => set('establishedDate', v)} type="date" />
          <Field label="Location" value={form.location} onChange={(v) => set('location', v)} />
          <Field label="Province" value={form.province} onChange={(v) => set('province', v)} />
          <Field label="Line ministry" value={form.ministry} onChange={(v) => set('ministry', v)} />
          <Field label="Government ownership %" value={form.ownershipPct} onChange={(v) => set('ownershipPct', v)} type="number" />
          <Field label="CEO" value={form.ceoName} onChange={(v) => set('ceoName', v)} />
          <Field label="CFO / Director of Finance" value={form.cfoName} onChange={(v) => set('cfoName', v)} />
          <Field label="Board chairperson" value={form.boardChair} onChange={(v) => set('boardChair', v)} />
          <Field label="Investment amount (RWF)" value={form.investmentAmount} onChange={(v) => set('investmentAmount', v)} type="number" />
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Short description of the business
          </span>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
          />
        </label>
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Required registration documents
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              These files will be linked to the SOE registration submission and stored in its company
              folder.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SupportingFileField
              label="Business case"
              description="Approved justification for establishing the SOE."
              file={supportingFiles.businessCase}
              onChange={(file) => setSupportingFiles((current) => ({ ...current, businessCase: file }))}
            />
            <SupportingFileField
              label="Business plan / strategy"
              description="Business model, strategy and implementation plan."
              file={supportingFiles.businessPlan}
              onChange={(file) => setSupportingFiles((current) => ({ ...current, businessPlan: file }))}
            />
            <SupportingFileField
              label="Registration certificate"
              description="Official company registration certificate."
              file={supportingFiles.registrationCertificate}
              onChange={(file) =>
                setSupportingFiles((current) => ({ ...current, registrationCertificate: file }))
              }
            />
            <SupportingFileField
              label="Shareholder agreement"
              description="Executed shareholder agreement."
              file={supportingFiles.shareholderAgreement}
              onChange={(file) =>
                setSupportingFiles((current) => ({ ...current, shareholderAgreement: file }))
              }
            />
            <SupportingFileField
              label="Articles of association"
              description="Approved articles governing the company."
              file={supportingFiles.articlesOfAssociation}
              onChange={(file) =>
                setSupportingFiles((current) => ({ ...current, articlesOfAssociation: file }))
              }
            />
          </div>
        </section>
        <Button
          disabled={busy || !form.code || !form.name || !form.sector || !allDocumentsSelected}
          onClick={() => void save()}
        >
          Save SOE creation draft
        </Button>
      </PanelBody>
    </Panel>
  );
}

function ProfileUpdateForm({
  user,
  companies,
  defaultCompanyId,
  busy,
  setBusy,
  onCreated,
}: {
  user: AuthUser;
  companies: Array<{ id: string; name: string; code: string }>;
  defaultCompanyId: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [form, setForm] = useState({
    name: '',
    sector: '',
    establishedDate: '',
    location: '',
    province: '',
    ministry: '',
    description: '',
    investmentAmount: '',
    ownershipPct: '',
    ceoName: '',
    cfoName: '',
    boardChair: '',
    changeSummary: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) return;

    setLoadingProfile(true);
    void companiesApi
      .get(companyId)
      .then(({ data }) => {
        if (cancelled) return;
        setForm({
          name: data.name,
          sector: data.sector,
          establishedDate: data.createdDate ?? '',
          location: data.location ?? '',
          province: data.province ?? '',
          ministry: data.ministry ?? '',
          description: data.description ?? '',
          investmentAmount: String(data.investmentAmount ?? 0),
          ownershipPct: String(data.ownershipPct ?? 0),
          ceoName: data.ceoName ?? '',
          cfoName: data.cfoName ?? '',
          boardChair: data.boardChair ?? '',
          changeSummary: '',
        });
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Unable to load current profile');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return (
    <Panel>
      <PanelHeader
        title="Business Process 2 — Update SOE profile"
        description="Current company values are loaded below. Edit only what needs to change, describe the update, then send it for approval."
      />
      <PanelBody className="space-y-4">
        {!user.companyId && (
          <label className="block text-sm">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Company
            </span>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {loadingProfile && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Loading current company profile…
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Sector" value={form.sector} onChange={(v) => setForm({ ...form, sector: v })} />
          <Field
            label="Date of establishment"
            value={form.establishedDate}
            onChange={(v) => setForm({ ...form, establishedDate: v })}
            type="date"
          />
          <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <Field label="Province" value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
          <Field label="Line ministry" value={form.ministry} onChange={(v) => setForm({ ...form, ministry: v })} />
          <Field
            label="Investment amount (RWF)"
            value={form.investmentAmount}
            onChange={(v) => setForm({ ...form, investmentAmount: v })}
            type="number"
          />
          <Field
            label="Government ownership %"
            value={form.ownershipPct}
            onChange={(v) => setForm({ ...form, ownershipPct: v })}
            type="number"
          />
          <Field label="CEO" value={form.ceoName} onChange={(v) => setForm({ ...form, ceoName: v })} />
          <Field label="CFO" value={form.cfoName} onChange={(v) => setForm({ ...form, cfoName: v })} />
          <Field label="Board chairperson" value={form.boardChair} onChange={(v) => setForm({ ...form, boardChair: v })} />
        </div>
        <Field
          label="Summary of changes"
          value={form.changeSummary}
          onChange={(v) => setForm({ ...form, changeSummary: v })}
        />
        <label className="block text-sm">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Updated description
          </span>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
          />
        </label>
        <Button
          disabled={busy || loadingProfile || !companyId}
          onClick={() =>
            void createAndToast(
              {
                companyId,
                type: 'profile_update',
                title: `Profile update — ${companies.find((c) => c.id === companyId)?.code ?? 'SOE'}`,
                payload: {
                  ...form,
                  investmentAmount: Number(form.investmentAmount || 0),
                  ownershipPct: Number(form.ownershipPct || 0),
                },
              },
              onCreated,
              setBusy,
            )
          }
        >
          Save profile update draft
        </Button>
      </PanelBody>
    </Panel>
  );
}
