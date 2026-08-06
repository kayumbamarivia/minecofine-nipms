import { useState } from 'react';
import { Plus, Trash, UploadSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Panel, PanelBody, PanelHeader } from './layout/PageHeader';
import { SupportingFileField } from './SupportingFileField';
import {
  importsApi,
  documentsApi,
  submissionsApi,
  type ImportedContractKpi,
  type ImportedContractObjective,
} from '../../utils/services';
import type { AuthUser, StoredDocumentCategory } from '../../types';

interface PerformanceContractFormProps {
  user: AuthUser;
  companies: Array<{ id: string; name: string; code: string }>;
  defaultCompanyId: string;
  busy: boolean;
  setBusy: (value: boolean) => void;
  onCreated: () => Promise<void>;
}

type KpiSectionKey = 'financialKpis' | 'operationalKpis' | 'governanceKpis';
type UiObjective = ImportedContractObjective & { rowKey: string };
type UiKpi = ImportedContractKpi & { rowKey: string };
type SupportingFiles = {
  performanceContract: File | null;
  budgetActionPlan: File | null;
  strategicPlan: File | null;
};

const emptyObjective = (index: number): UiObjective => ({
  rowKey: crypto.randomUUID(),
  id: `SO${index + 1}`,
  objective: '',
  description: '',
});

const emptyKpi = (prefix: string, index: number): UiKpi => ({
  rowKey: crypto.randomUUID(),
  kpi: `${prefix}${index + 1}`,
  baseline: '',
  target: '',
  actual: '',
  score: '',
  narrative: '',
});

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}>) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
      />
    </label>
  );
}

function ObjectiveTable({
  rows,
  onChange,
}: Readonly<{
  rows: UiObjective[];
  onChange: (rows: UiObjective[]) => void;
}>) {
  const update = (
    index: number,
    key: keyof UiObjective,
    value: string,
  ) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          2. Strategic objectives for the year
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Add as many objectives as this company needs.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-24 px-4 py-3">No.</th>
              <th className="min-w-56 px-4 py-3">Strategic objective</th>
              <th className="min-w-72 px-4 py-3">Description</th>
              <th className="w-14 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.rowKey} className="bg-white align-top hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <input
                    value={row.id}
                    onChange={(event) => update(index, 'id', event.target.value)}
                    className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={row.objective}
                    onChange={(event) => update(index, 'objective', event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={row.description}
                    onChange={(event) => update(index, 'description', event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    aria-label={`Remove objective ${index + 1}`}
                    onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
                    disabled={rows.length === 1}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, emptyObjective(rows.length)])}
        >
          <Plus /> Add objective
        </Button>
      </div>
    </section>
  );
}

function KpiTable({
  title,
  prefix,
  rows,
  onChange,
}: Readonly<{
  title: string;
  prefix: string;
  rows: UiKpi[];
  onChange: (rows: UiKpi[]) => void;
}>) {
  const update = (index: number, key: keyof UiKpi, value: string) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Track baseline, target, actual performance, and scoring for each KPI.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, emptyKpi(prefix, rows.length)])}
          className="shrink-0"
        >
          <Plus /> Add KPI
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] text-sm">
            <thead className="bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-28 px-4 py-3">KPI</th>
              <th className="w-32 px-4 py-3">Baseline</th>
              <th className="w-32 px-4 py-3">Target</th>
              <th className="w-32 px-4 py-3">Actual</th>
              <th className="w-24 px-4 py-3">Score (1–5)</th>
              <th className="min-w-72 px-4 py-3">Narrative</th>
              <th className="w-14 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.rowKey} className="bg-white align-top hover:bg-slate-50/50">
                  {(['kpi', 'baseline', 'target', 'actual'] as const).map((key) => (
                    <td key={key} className="px-4 py-3">
                      <input
                        value={row[key]}
                        onChange={(event) => update(index, key, event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={row.score}
                      onChange={(event) => update(index, 'score', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.narrative}
                      onChange={(event) => update(index, 'narrative', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-label={`Remove ${title} row ${index + 1}`}
                      onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
                      disabled={rows.length === 1}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function PerformanceContractForm({
  user,
  companies,
  defaultCompanyId,
  busy,
  setBusy,
  onCreated,
}: Readonly<PerformanceContractFormProps>) {
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [financialYear, setFinancialYear] = useState('FY 2026/27');
  const [contractDate, setContractDate] = useState('');
  const [mandateStatement, setMandateStatement] = useState('');
  const [strategicObjectives, setStrategicObjectives] = useState([emptyObjective(0)]);
  const [financialKpis, setFinancialKpis] = useState([emptyKpi('FP', 0)]);
  const [operationalKpis, setOperationalKpis] = useState([emptyKpi('OP', 0)]);
  const [governanceKpis, setGovernanceKpis] = useState([emptyKpi('GV', 0)]);
  const [overallPerformanceRating, setOverallPerformanceRating] = useState('');
  const [chairmanNarrative, setChairmanNarrative] = useState({
    keyAchievements: '',
    keyChallengesRisks: '',
    forwardLookingPriorities: '',
  });
  const [supportingFiles, setSupportingFiles] = useState<SupportingFiles>({
    performanceContract: null,
    budgetActionPlan: null,
    strategicPlan: null,
  });
  const [importBusy, setImportBusy] = useState(false);

  const importContract = async (file: File | undefined) => {
    if (!file) return;
    setImportBusy(true);
    try {
      const { data } = await importsApi.parsePerformanceContract(file);
      setSupportingFiles((current) => ({ ...current, performanceContract: file }));
      if (data.financialYear) setFinancialYear(data.financialYear);
      if (data.contractDate) setContractDate(data.contractDate);
      setMandateStatement(data.mandateStatement);
      if (data.strategicObjectives.length) {
        setStrategicObjectives(
          data.strategicObjectives.map((row) => ({ ...row, rowKey: crypto.randomUUID() })),
        );
      }
      if (data.financialKpis.length) {
        setFinancialKpis(
          data.financialKpis.map((row) => ({ ...row, rowKey: crypto.randomUUID() })),
        );
      }
      if (data.operationalKpis.length) {
        setOperationalKpis(
          data.operationalKpis.map((row) => ({ ...row, rowKey: crypto.randomUUID() })),
        );
      }
      if (data.governanceKpis.length) {
        setGovernanceKpis(
          data.governanceKpis.map((row) => ({ ...row, rowKey: crypto.randomUUID() })),
        );
      }
      setOverallPerformanceRating(data.overallPerformanceRating);
      setChairmanNarrative(data.chairmanNarrative);

      if (!user.companyId && data.companyName) {
        const matchingCompany = companies.find(
          (company) => company.name.toLowerCase() === data.companyName.toLowerCase(),
        );
        if (matchingCompany) setCompanyId(matchingCompany.id);
      }
      toast.success('Performance contract imported. Review the populated fields before saving.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to import contract');
    } finally {
      setImportBusy(false);
    }
  };

  const updateKpiSection = (key: KpiSectionKey, rows: UiKpi[]) => {
    if (key === 'financialKpis') setFinancialKpis(rows);
    if (key === 'operationalKpis') setOperationalKpis(rows);
    if (key === 'governanceKpis') setGovernanceKpis(rows);
  };

  const save = async () => {
    setBusy(true);
    try {
      const company = companies.find((item) => item.id === companyId);
      const payload: Record<string, unknown> = {
        companyName: company?.name ?? user.companyName ?? '',
        financialYear,
        contractDate,
        mandateStatement,
        strategicObjectives: strategicObjectives.map(({ rowKey: _rowKey, ...row }) => row),
        kpiScorecard: {
          financial: financialKpis.map(({ rowKey: _rowKey, ...row }) => row),
          operationalStrategic: operationalKpis.map(({ rowKey: _rowKey, ...row }) => row),
          governanceRisk: governanceKpis.map(({ rowKey: _rowKey, ...row }) => row),
        },
        overallPerformanceRating,
        chairmanNarrative,
        documentChecklist: {
          performanceContractAttached: Boolean(supportingFiles.performanceContract),
          budgetAttached: Boolean(supportingFiles.budgetActionPlan),
          strategicPlanAttached: Boolean(supportingFiles.strategicPlan),
        },
      };
      const created = await submissionsApi.create({
        companyId,
        type: 'planning_budgeting',
        title: `Annual Performance Contract — ${financialYear}`,
        period: financialYear,
        payload,
      });

      const files: Array<{
        file: File | null;
        name: string;
        category: StoredDocumentCategory;
      }> = [
        {
          file: supportingFiles.performanceContract,
          name: 'Signed performance contract',
          category: 'performance_contract',
        },
        {
          file: supportingFiles.budgetActionPlan,
          name: 'Budget and action plan',
          category: 'budget_action_plan',
        },
        {
          file: supportingFiles.strategicPlan,
          name: 'Strategic / business plan',
          category: 'strategic_plan',
        },
      ];

      const uploadedDocuments = await Promise.all(
        files
          .filter((item): item is typeof item & { file: File } => item.file !== null)
          .map(async (item) => {
            const form = new FormData();
            form.append('file', item.file);
            form.append('companyId', companyId);
            form.append('submissionId', created.data.id);
            form.append('name', item.name);
            form.append('category', item.category);
            return (await documentsApi.upload(form)).data;
          }),
      );

      if (uploadedDocuments.length) {
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
      }
      await onCreated();
      const documentLabel = uploadedDocuments.length === 1 ? 'document' : 'documents';
      toast.success(
        uploadedDocuments.length
          ? `Draft saved with ${uploadedDocuments.length} linked ${documentLabel}`
          : 'Performance contract draft saved',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save performance contract');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Business Process 3 — Planning and budgeting"
        description="Record the annual performance contract. Add as many objectives and KPIs as the company requires; sign-off remains in the signed document."
      />
      <PanelBody className="space-y-7">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Already completed the Word performance contract?
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Upload the completed .docx to populate the form automatically. It will also be selected
            as the performance-contract attachment when you save.
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-rw-blue hover:bg-blue-50">
            <UploadSimple className="h-4 w-4" />
            {importBusy ? 'Reading document…' : 'Import completed contract (.docx)'}
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              disabled={importBusy}
              onChange={(event) => {
                void importContract(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!user.companyId && (
            <label className="block text-sm">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Company name
              </span>
              <select
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.code} — {company.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <TextField label="Financial year" value={financialYear} onChange={setFinancialYear} />
          <TextField label="Contract date" value={contractDate} onChange={setContractDate} />
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            1. Company mandate (strategic role)
          </span>
          <textarea
            rows={4}
            value={mandateStatement}
            onChange={(event) => setMandateStatement(event.target.value)}
            placeholder="Briefly state the company’s mandate."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
          />
        </label>

        <ObjectiveTable rows={strategicObjectives} onChange={setStrategicObjectives} />

        <section className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">3. KPI scorecard</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Score each KPI from 1 (below target) to 5 (exceeds target).
            </p>
          </div>
          <KpiTable
            title="A. Financial KPIs"
            prefix="FP"
            rows={financialKpis}
            onChange={(rows) => updateKpiSection('financialKpis', rows)}
          />
          <KpiTable
            title="B. Operational & strategic KPIs"
            prefix="OP"
            rows={operationalKpis}
            onChange={(rows) => updateKpiSection('operationalKpis', rows)}
          />
          <KpiTable
            title="C. Governance & risk KPIs"
            prefix="GV"
            rows={governanceKpis}
            onChange={(rows) => updateKpiSection('governanceKpis', rows)}
          />
        </section>

        <fieldset className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <legend className="px-1 text-sm font-semibold text-slate-900">
            4. Overall performance assessment
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ['below_expectations', 'Below Expectations'],
              ['meets_expectations', 'Meets Expectations'],
              ['exceeds_expectations', 'Exceeds Expectations'],
            ].map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-rw-blue/30 hover:bg-white"
              >
                <input
                  type="radio"
                  name="performance-rating"
                  value={value}
                  checked={overallPerformanceRating === value}
                  onChange={(event) => setOverallPerformanceRating(event.target.value)}
                  className="h-4 w-4 border-slate-300 text-rw-blue focus:ring-rw-blue/30"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            5. Chairman&apos;s strategic narrative
          </h3>
          {[
            ['keyAchievements', 'Key achievements'],
            ['keyChallengesRisks', 'Key challenges & risks'],
            ['forwardLookingPriorities', 'Forward-looking priorities'],
          ].map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </span>
              <textarea
                rows={3}
                value={chairmanNarrative[key as keyof typeof chairmanNarrative]}
                onChange={(event) =>
                  setChairmanNarrative((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
              />
            </label>
          ))}
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Supporting documents</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Selected files are uploaded and linked to this submission when the draft is saved.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SupportingFileField
              label="Signed performance contract"
              description="Completed Word contract or signed PDF."
              file={supportingFiles.performanceContract}
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(file) =>
                setSupportingFiles((current) => ({ ...current, performanceContract: file }))
              }
            />
            <SupportingFileField
              label="Budget and action plan"
              description="Approved budget and implementation plan."
              file={supportingFiles.budgetActionPlan}
              accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf"
              onChange={(file) =>
                setSupportingFiles((current) => ({ ...current, budgetActionPlan: file }))
              }
            />
            <SupportingFileField
              label="Strategic / business plan"
              description="Optional, when revised for this financial year."
              file={supportingFiles.strategicPlan}
              accept=".pdf,.doc,.docx,application/pdf"
              onChange={(file) =>
                setSupportingFiles((current) => ({ ...current, strategicPlan: file }))
              }
            />
          </div>
        </section>

        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Sign-off names, titles, signatures and dates are intentionally excluded from this form and
          remain on the signed performance contract document.
        </p>

        <Button disabled={busy || !companyId || !financialYear} onClick={() => void save()}>
          Save planning draft
        </Button>
      </PanelBody>
    </Panel>
  );
}
