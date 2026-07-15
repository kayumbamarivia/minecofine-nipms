import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { PageHeader, Panel, PanelBody, PanelHeader } from './layout/PageHeader';
import { importsApi, submissionsApi } from '../../utils/services';
import { getToken } from '../../utils/api';
import { canCreateSubmission, isCompanyRole } from '../../utils/roles';
import { computeFinancialRatios, EMPTY_STATEMENTS, type FinancialStatements } from '../../utils/ratios';
import { formatRwf } from '../../utils/format';
import type { AuthUser, SubmissionType } from '../../types';
import { toast } from 'sonner';

interface ProcessWorkspaceProps {
  user: AuthUser;
  companies: Array<{ id: string; name: string; code: string }>;
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

      <div className="flex flex-wrap gap-2">
        {visible.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              active === tab.key
                ? 'bg-rw-blue text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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
        <PlanningForm
          user={user}
          companies={companies}
          defaultCompanyId={defaultCompanyId}
          busy={busy}
          setBusy={setBusy}
          onCreated={onCreated}
        />
      )}
      {(active === 'quarterly_report' || active === 'annual_report') && (
        <QuarterlyReportForm
          user={user}
          companies={companies}
          defaultCompanyId={defaultCompanyId}
          busy={busy}
          setBusy={setBusy}
          onCreated={onCreated}
          reportType={active}
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

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Required attachment checklist (upload module next): business case, business plan/strategy,
          registration certificate, shareholder agreements, articles of association.
        </p>
        <Button
          disabled={busy || !form.code || !form.name || !form.sector}
          onClick={() =>
            void createAndToast(
              {
                type: 'soe_creation',
                title: `SOE Registration — ${form.name || form.code}`,
                payload: {
                  ...form,
                  investmentAmount: Number(form.investmentAmount),
                  ownershipPct: Number(form.ownershipPct),
                },
              },
              onCreated,
              setBusy,
            )
          }
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
    location: '',
    province: '',
    description: '',
    ceoName: '',
    cfoName: '',
    boardChair: '',
    changeSummary: '',
  });

  return (
    <Panel>
      <PanelHeader
        title="Business Process 2 — Update SOE profile"
        description="Record changes to location, management or board composition, then send for approval."
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <Field label="Province" value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
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
          disabled={busy || !companyId}
          onClick={() =>
            void createAndToast(
              {
                companyId,
                type: 'profile_update',
                title: `Profile update — ${companies.find((c) => c.id === companyId)?.code ?? 'SOE'}`,
                payload: form,
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

function PlanningForm({
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
  const [fiscalYear, setFiscalYear] = useState('FY 2026/27');
  const [form, setForm] = useState({
    budgetTotal: '',
    financialTarget: '',
    operationalTarget: '',
    governanceTarget: '',
    performanceContractAttached: false,
    budgetAttached: false,
    strategicPlanAttached: false,
  });

  return (
    <Panel>
      <PanelHeader
        title="Business Process 3 — Planning and budgeting"
        description="Capture annual KPI targets and performance contract package for ministry review."
      />
      <PanelBody className="space-y-4">
        {!user.companyId && (
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
        )}
        <Field label="Fiscal year" value={fiscalYear} onChange={setFiscalYear} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Budget total (RWF)"
            value={form.budgetTotal}
            onChange={(v) => setForm({ ...form, budgetTotal: v })}
            type="number"
          />
          <Field
            label="Financial KPI target"
            value={form.financialTarget}
            onChange={(v) => setForm({ ...form, financialTarget: v })}
          />
          <Field
            label="Operational KPI target"
            value={form.operationalTarget}
            onChange={(v) => setForm({ ...form, operationalTarget: v })}
          />
          <Field
            label="Governance KPI target"
            value={form.governanceTarget}
            onChange={(v) => setForm({ ...form, governanceTarget: v })}
          />
        </div>
        <div className="space-y-2 text-sm text-slate-700">
          {[
            ['performanceContractAttached', 'Signed performance contract attached'],
            ['budgetAttached', 'Budget and action plan attached'],
            ['strategicPlanAttached', 'Strategic / business plan attached (if revised)'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form[key as keyof typeof form] as boolean}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
        <Button
          disabled={busy || !companyId}
          onClick={() =>
            void createAndToast(
              {
                companyId,
                type: 'planning_budgeting',
                title: `Planning & Budgeting — ${fiscalYear}`,
                period: fiscalYear,
                payload: {
                  ...form,
                  budgetTotal: Number(form.budgetTotal || 0),
                },
              },
              onCreated,
              setBusy,
            )
          }
        >
          Save planning draft
        </Button>
      </PanelBody>
    </Panel>
  );
}

function QuarterlyReportForm({
  user,
  companies,
  defaultCompanyId,
  busy,
  setBusy,
  onCreated,
  reportType = 'quarterly_report',
}: {
  user: AuthUser;
  companies: Array<{ id: string; name: string; code: string }>;
  defaultCompanyId: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onCreated: () => Promise<void>;
  reportType?: 'quarterly_report' | 'annual_report';
}) {
  const isAnnual = reportType === 'annual_report';
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [period, setPeriod] = useState(isAnnual ? 'FY 2025/26' : 'Q2 2026');
  const [fs, setFs] = useState<FinancialStatements>({ ...EMPTY_STATEMENTS });
  const [ops, setOps] = useState({ metric1: '', metric2: '', notes: '' });
  const [gov, setGov] = useState({ boardMeetingsHeld: '', governanceScore: '', notes: '' });
  const [docs, setDocs] = useState({
    signedFinancialStatements: false,
    boardMinutes: false,
    otherReports: false,
  });

  const ratios = useMemo(() => computeFinancialRatios(fs), [fs]);
  const [importBusy, setImportBusy] = useState(false);

  const setMoney = (key: keyof FinancialStatements, value: string) => {
    setFs((prev) => ({ ...prev, [key]: Number(value || 0) }));
  };

  const onImportSpreadsheet = async (file: File | undefined) => {
    if (!file) return;
    setImportBusy(true);
    try {
      const res = await importsApi.parseFinancialStatements(file);
      setFs({ ...EMPTY_STATEMENTS, ...(res.data.financialStatements as FinancialStatements) });
      toast.success(
        `Imported ${res.data.mappedFields.length} fields from spreadsheet` +
          (res.data.unmappedHeaders.length
            ? ` (${res.data.unmappedHeaders.length} columns skipped)`
            : ''),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImportBusy(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = getToken();
      const response = await fetch(importsApi.financialTemplateUrl(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Could not download template');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nipms-financial-statement-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Template download failed');
    }
  };

  return (
    <Panel>
      <PanelHeader
        title={
          isAnnual
            ? 'Business Process 6 — Annual report'
            : 'Business Process 4 — Quarterly report'
        }
        description={
          isAnnual
            ? 'Submit full-year financial statements, operational and governance metrics for ministry review (Process 7).'
            : 'Enter financial statements, operational and governance metrics. Ratios and red flags are calculated automatically.'
        }
      />
      <PanelBody className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {!user.companyId && (
            <label className="block text-sm sm:col-span-1">
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
          <Field
            label={isAnnual ? 'Fiscal year' : 'Reporting period'}
            value={period}
            onChange={setPeriod}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Import from Excel / CSV</p>
          <p className="mt-1 text-xs text-slate-600">
            Download the template, fill values, then upload to populate the statement tables. You can still edit fields afterwards.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => void downloadTemplate()}>
              Download CSV template
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium hover:bg-slate-50">
                {importBusy ? 'Importing…' : 'Upload spreadsheet'}
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="sr-only"
                disabled={importBusy}
                onChange={(e) => {
                  void onImportSpreadsheet(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Income statement</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Revenue" value={fs.revenue || ''} onChange={(v) => setMoney('revenue', v)} type="number" />
            <Field label="Cost of sales" value={fs.costOfSales || ''} onChange={(v) => setMoney('costOfSales', v)} type="number" />
            <Field label="Operating expenses" value={fs.operatingExpenses || ''} onChange={(v) => setMoney('operatingExpenses', v)} type="number" />
            <Field label="Interest expense" value={fs.interestExpense || ''} onChange={(v) => setMoney('interestExpense', v)} type="number" />
            <Field label="Tax expense" value={fs.taxExpense || ''} onChange={(v) => setMoney('taxExpense', v)} type="number" />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Balance sheet</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Current assets" value={fs.currentAssets || ''} onChange={(v) => setMoney('currentAssets', v)} type="number" />
            <Field label="Non-current assets" value={fs.nonCurrentAssets || ''} onChange={(v) => setMoney('nonCurrentAssets', v)} type="number" />
            <Field label="Current liabilities" value={fs.currentLiabilities || ''} onChange={(v) => setMoney('currentLiabilities', v)} type="number" />
            <Field label="Non-current liabilities" value={fs.nonCurrentLiabilities || ''} onChange={(v) => setMoney('nonCurrentLiabilities', v)} type="number" />
            <Field label="Equity" value={fs.equity || ''} onChange={(v) => setMoney('equity', v)} type="number" />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Cash flow (summary)</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Operating cash flow" value={fs.operatingCashFlow || ''} onChange={(v) => setMoney('operatingCashFlow', v)} type="number" />
            <Field label="Investing cash flow" value={fs.investingCashFlow || ''} onChange={(v) => setMoney('investingCashFlow', v)} type="number" />
            <Field label="Financing cash flow" value={fs.financingCashFlow || ''} onChange={(v) => setMoney('financingCashFlow', v)} type="number" />
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <RatioTile label="Gross profit" value={formatRwf(ratios.grossProfit, true)} />
          <RatioTile label="EBITDA" value={formatRwf(ratios.ebitda, true)} />
          <RatioTile label="Net income" value={formatRwf(ratios.netIncome, true)} />
          <RatioTile label="Current ratio" value={ratios.currentRatio?.toFixed(2) ?? '—'} />
          <RatioTile label="Gross margin" value={ratios.grossMarginPct != null ? `${ratios.grossMarginPct}%` : '—'} />
          <RatioTile label="EBITDA margin" value={ratios.ebitdaMarginPct != null ? `${ratios.ebitdaMarginPct}%` : '—'} />
          <RatioTile label="ROE" value={ratios.returnOnEquityPct != null ? `${ratios.returnOnEquityPct}%` : '—'} />
          <RatioTile label="Debt / Equity" value={ratios.debtToEquity?.toFixed(2) ?? '—'} />
        </div>

        {ratios.redFlags.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Red flags</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {ratios.redFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Operational metrics</h3>
            <Field label="Primary operational KPI" value={ops.metric1} onChange={(v) => setOps({ ...ops, metric1: v })} />
            <Field label="Secondary operational KPI" value={ops.metric2} onChange={(v) => setOps({ ...ops, metric2: v })} />
            <Field label="Notes" value={ops.notes} onChange={(v) => setOps({ ...ops, notes: v })} />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Governance metrics</h3>
            <Field
              label="Board meetings held"
              value={gov.boardMeetingsHeld}
              onChange={(v) => setGov({ ...gov, boardMeetingsHeld: v })}
              type="number"
            />
            <Field
              label="Governance score"
              value={gov.governanceScore}
              onChange={(v) => setGov({ ...gov, governanceScore: v })}
              type="number"
            />
            <Field label="Notes" value={gov.notes} onChange={(v) => setGov({ ...gov, notes: v })} />
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Document checklist</p>
          {[
            ['signedFinancialStatements', 'Signed financial statements'],
            ['boardMinutes', 'Board minutes (previous quarter)'],
            ['otherReports', 'Other shareholder reports'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={docs[key as keyof typeof docs]}
                onChange={(e) => setDocs({ ...docs, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        <Button
          disabled={busy || !companyId}
          onClick={() =>
            void createAndToast(
              {
                companyId,
                type: reportType,
                title: `${isAnnual ? 'Annual' : 'Quarterly'} Report — ${period}`,
                period,
                payload: {
                  financialStatements: fs,
                  operationalMetrics: ops,
                  governanceMetrics: gov,
                  documentChecklist: docs,
                },
              },
              onCreated,
              setBusy,
            )
          }
        >
          Save {isAnnual ? 'annual' : 'quarterly'} draft
        </Button>
      </PanelBody>
    </Panel>
  );
}

function RatioTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
