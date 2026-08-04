import { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Panel, PanelBody, PanelHeader } from './layout/PageHeader';
import { SupportingFileField } from './SupportingFileField';
import { FinancialPackImportPanel } from './FinancialPackImportPanel';
import { documentsApi, submissionsApi, type ParsedFinancialPack } from '../../utils/services';
import { computeFinancialRatios } from '../../utils/ratios';
import { formatRwf } from '../../utils/format';
import {
  AMOUNT_COLUMNS,
  BALANCE_SHEET_LINES,
  buildQuarterlyPayload,
  CASH_FLOW_LINES,
  emptyTrialBalanceRow,
  emptyKpiRows,
  EMPTY_ANALYSIS_COMMENTS,
  EQUITY_LINES,
  GOVERNANCE_KPIS,
  INCOME_STATEMENT_LINES,
  initDisclosureNotes,
  initStatementMap,
  OPERATIONAL_KPIS,
  recomputeTotals,
  type AmountKey,
  type AmountRow,
  type DisclosureNoteRow,
  type FinancialAnalysisComments,
  type KpiRow,
  type QuarterlyCover,
  type StatementLineDef,
  type StatementMap,
  type TrialBalanceRow,
  variance,
} from '../../utils/quarterlyReportSchema';
import type { AuthUser, StoredDocumentCategory } from '../../types';

type CompanyOption = { id: string; name: string; code: string; sector?: string };

const SECTIONS = [
  { id: 'cover', label: 'Cover', short: '1. Cover' },
  { id: 'trial', label: 'Trial Balance', short: '2. Trial Balance' },
  { id: 'balance', label: 'Balance Sheet', short: '3. Balance Sheet' },
  { id: 'income', label: 'Income Statement', short: '4. Income' },
  { id: 'cashflow', label: 'Cash Flow Statement', short: '5. Cash Flow' },
  { id: 'equity', label: 'Changes in Equity', short: '6. Equity' },
  { id: 'bsnotes', label: 'Balance Sheet Notes', short: '7. BS Notes' },
  { id: 'isnotes', label: 'Income Statement Notes', short: '8. IS Notes' },
  { id: 'analysis', label: 'Financial Analysis', short: '9. Analysis' },
  { id: 'kpis', label: 'Other KPIs Dashboard', short: '10. KPIs' },
  { id: 'review', label: 'Completeness Review', short: '11. Review' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const COLUMN_LABELS: Record<AmountKey, string> = {
  priorYear: 'Prior year (same Q)',
  currentQuarter: 'Current quarter',
  ytd: 'YTD actual',
  budget: 'Budget / Target',
};

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}>) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
      />
    </label>
  );
}

function formatCell(value: number): string {
  if (!value) return '';
  return String(value);
}

function parseCell(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const TRIAL_AMOUNT_FIELDS = [
  ['priorYearDebit', 'Prior year debit'],
  ['priorYearCredit', 'Prior year credit'],
  ['currentQuarterDebit', 'Current Q debit'],
  ['currentQuarterCredit', 'Current Q credit'],
  ['ytdDebit', 'YTD debit'],
  ['ytdCredit', 'YTD credit'],
  ['budgetDebit', 'Budget debit'],
  ['budgetCredit', 'Budget credit'],
] as const;

function TrialBalanceTable({
  rows,
  onChange,
}: Readonly<{ rows: TrialBalanceRow[]; onChange: (rows: TrialBalanceRow[]) => void }>) {
  const update = (id: string, patch: Partial<TrialBalanceRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[1700px] w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <th className="px-3 py-2.5">GL code</th>
              <th className="px-3 py-2.5 min-w-56">Account description</th>
              <th className="px-2 py-2.5">Note</th>
              {TRIAL_AMOUNT_FIELDS.map(([, label]) => (
                <th key={label} className="px-2 py-2.5 text-right">{label}</th>
              ))}
              <th className="px-2 py-2.5">Maps to</th>
              <th className="px-2 py-2.5">Statement row</th>
              <th className="px-2 py-2.5 min-w-48">Source / input</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-1.5 py-1">
                  <input value={row.glCode} onChange={(e) => update(row.id, { glCode: e.target.value })} className="w-24 rounded border border-slate-200 px-2 py-1.5" />
                </td>
                <td className="px-1.5 py-1">
                  <input value={row.accountDescription} onChange={(e) => update(row.id, { accountDescription: e.target.value })} className="w-full rounded border border-slate-200 px-2 py-1.5" />
                </td>
                <td className="px-1.5 py-1">
                  <input value={row.noteRef} onChange={(e) => update(row.id, { noteRef: e.target.value })} className="w-16 rounded border border-slate-200 px-2 py-1.5" />
                </td>
                {TRIAL_AMOUNT_FIELDS.map(([field]) => (
                  <td key={field} className="px-1.5 py-1">
                    <input
                      inputMode="decimal"
                      value={formatCell(row[field])}
                      onChange={(e) => update(row.id, { [field]: parseCell(e.target.value) })}
                      className="w-28 rounded border border-slate-200 px-2 py-1.5 text-right tabular-nums"
                      placeholder="0"
                    />
                  </td>
                ))}
                <td className="px-1.5 py-1">
                  <select
                    value={row.mapsTo}
                    onChange={(e) => update(row.id, { mapsTo: e.target.value as TrialBalanceRow['mapsTo'] })}
                    className="w-40 rounded border border-slate-200 px-2 py-1.5"
                  >
                    <option value="">Select…</option>
                    <option>Balance Sheet</option>
                    <option>Income Statement</option>
                    <option>Cash Flow</option>
                  </select>
                </td>
                <td className="px-1.5 py-1">
                  <input value={row.statementRow} onChange={(e) => update(row.id, { statementRow: e.target.value })} className="w-32 rounded border border-slate-200 px-2 py-1.5" />
                </td>
                <td className="px-1.5 py-1">
                  <input value={row.source} onChange={(e) => update(row.id, { source: e.target.value })} className="w-full rounded border border-slate-200 px-2 py-1.5" />
                </td>
                <td className="px-1 py-1">
                  <button type="button" aria-label="Remove trial balance row" onClick={() => onChange(rows.filter((item) => item.id !== row.id))} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, emptyTrialBalanceRow()])}>
        <Plus className="mr-1 h-4 w-4" /> Add account row
      </Button>
    </div>
  );
}

function DisclosureNotesTable({
  rows,
  onChange,
}: Readonly<{ rows: DisclosureNoteRow[]; onChange: (rows: DisclosureNoteRow[]) => void }>) {
  const update = (ref: string, patch: Partial<DisclosureNoteRow>) =>
    onChange(rows.map((row) => (row.ref === ref ? { ...row, ...patch } : row)));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-[1200px] w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            <th className="px-3 py-2.5 w-20">Ref</th>
            <th className="px-3 py-2.5 min-w-64">Disclosure</th>
            <th className="px-2 py-2.5 text-right">Current Q</th>
            <th className="px-2 py-2.5 text-right">YTD</th>
            <th className="px-2 py-2.5 text-right">Budget</th>
            <th className="px-3 py-2.5 min-w-72">Accounting disclosure / explanation</th>
            <th className="px-3 py-2.5 min-w-56">Supporting schedule / source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ref} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
              <td className="px-3 py-2 font-semibold text-slate-700">{row.ref}</td>
              <td className="px-3 py-2 text-slate-800">{row.title}</td>
              {(['currentQuarter', 'ytd', 'budget'] as const).map((field) => (
                <td key={field} className="px-1.5 py-1">
                  <input value={row[field]} onChange={(e) => update(row.ref, { [field]: e.target.value })} className="w-full rounded border border-slate-200 px-2 py-1.5 text-right" placeholder="—" />
                </td>
              ))}
              <td className="px-1.5 py-1">
                <textarea value={row.disclosure} onChange={(e) => update(row.ref, { disclosure: e.target.value })} className="min-h-16 w-full rounded border border-slate-200 px-2 py-1.5" placeholder="Movement, assumptions, maturity, measurement basis…" />
              </td>
              <td className="px-1.5 py-1">
                <textarea value={row.supportingSchedule} onChange={(e) => update(row.ref, { supportingSchedule: e.target.value })} className="min-h-16 w-full rounded border border-slate-200 px-2 py-1.5" placeholder="Schedule or source reference" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatementTable({
  defs,
  map,
  onChange,
  hint,
}: Readonly<{
  defs: StatementLineDef[];
  map: StatementMap;
  onChange: (next: StatementMap) => void;
  hint?: string;
}>) {
  const computed = useMemo(() => recomputeTotals(defs, map), [defs, map]);

  const setCell = (key: string, field: AmountKey, raw: string) => {
    const row: AmountRow = { ...(map[key] ?? { priorYear: 0, currentQuarter: 0, ytd: 0, budget: 0 }) };
    row[field] = parseCell(raw);
    onChange(recomputeTotals(defs, { ...map, [key]: row }));
  };

  return (
    <div className="space-y-3">
      {hint && (
        <p className="rounded-lg border border-rw-blue/20 bg-rw-blue-subtle px-3 py-2 text-xs text-rw-blue-dark">
          {hint}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[920px] w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2.5 w-[280px]">Line item</th>
              <th className="px-2 py-2.5 w-14">Note</th>
              {AMOUNT_COLUMNS.map((col) => (
                <th key={col} className="px-2 py-2.5 text-right">
                  {COLUMN_LABELS[col]}
                </th>
              ))}
              <th className="px-2 py-2.5 text-right">Variance (Budget − YTD)</th>
            </tr>
          </thead>
          <tbody>
            {defs.map((def) => {
              if (def.kind === 'header') {
                return (
                  <tr key={def.key} className="bg-slate-50">
                    <td
                      colSpan={7}
                      className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700"
                    >
                      {def.label}
                    </td>
                  </tr>
                );
              }

              const row = computed[def.key] ?? { priorYear: 0, currentQuarter: 0, ytd: 0, budget: 0 };
              const isTotal = def.kind === 'total' || def.kind === 'subtotal';
              const rowClass = isTotal
                ? 'bg-emerald-50/80 font-semibold text-slate-900'
                : 'hover:bg-slate-50/80 text-slate-800';

              return (
                <tr key={def.key} className={`border-t border-slate-100 ${rowClass}`}>
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5">
                    <span className={isTotal ? 'font-bold' : ''}>{def.label}</span>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-slate-500">{def.note ?? ''}</td>
                  {AMOUNT_COLUMNS.map((col) => (
                    <td key={col} className="px-1.5 py-1">
                      {isTotal ? (
                        <div className="px-2 py-1.5 text-right tabular-nums">
                          {formatRwf(row[col], true)}
                        </div>
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatCell(map[def.key]?.[col] ?? 0)}
                          onChange={(e) => setCell(def.key, col, e.target.value)}
                          className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-right tabular-nums outline-none hover:border-slate-200 focus:border-rw-blue focus:bg-white focus:ring-1 focus:ring-rw-blue/30"
                          placeholder="0"
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
                    {formatRwf(variance(row), true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiTable({
  rows,
  onChange,
  allowCustomLabel,
}: Readonly<{
  rows: KpiRow[];
  onChange: (rows: KpiRow[]) => void;
  allowCustomLabel?: boolean;
}>) {
  const update = (index: number, patch: Partial<KpiRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-[960px] w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            <th className="px-3 py-2.5 w-16">KPI</th>
            <th className="px-3 py-2.5">Description</th>
            <th className="px-2 py-2.5 text-right">Prior year</th>
            <th className="px-2 py-2.5 text-right">Current Q</th>
            <th className="px-2 py-2.5 text-right">YTD</th>
            <th className="px-2 py-2.5 text-right">Target</th>
            <th className="px-2 py-2.5 text-right">Variance</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isOther = row.label.includes('(specify)');
            const actual = Number(row.ytd || row.currentQuarter);
            const target = Number(row.target);
            const hasResult = Number.isFinite(actual) && Number.isFinite(target) && row.target !== '';
            const achievement = hasResult && target !== 0 ? actual / target : null;
            const status =
              achievement == null
                ? 'Not assessed'
                : achievement >= 1
                  ? 'Achieved'
                  : achievement >= 0.9
                    ? 'Partial'
                    : 'Not achieved';
            return (
              <tr key={row.key} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-3 py-2 font-medium text-slate-700">{row.key}</td>
                <td className="px-3 py-2">
                  {isOther && allowCustomLabel ? (
                    <input
                      value={row.customLabel}
                      onChange={(e) => update(index, { customLabel: e.target.value })}
                      placeholder={row.label}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-rw-blue"
                    />
                  ) : (
                    <span className="text-slate-800">{row.label}</span>
                  )}
                </td>
                {(['priorYear', 'currentQuarter', 'ytd', 'target'] as const).map((field) => (
                  <td key={field} className="px-1.5 py-1">
                    <input
                      value={row[field]}
                      onChange={(e) => update(index, { [field]: e.target.value })}
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-right outline-none hover:border-slate-200 focus:border-rw-blue focus:bg-white"
                      placeholder="—"
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                  {hasResult ? (actual - target).toLocaleString('en-RW') : '—'}
                </td>
                <td className="px-2 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                      status === 'Achieved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status === 'Partial'
                          ? 'bg-amber-100 text-amber-800'
                          : status === 'Not achieved'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {status}
                  </span>
                </td>
                <td className="px-2 py-1">
                  <input
                    value={row.notes}
                    onChange={(e) => update(index, { notes: e.target.value })}
                    className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 outline-none hover:border-slate-200 focus:border-rw-blue focus:bg-white"
                    placeholder="Optional"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type AnalysisMetric = {
  label: string;
  formula: string;
  format: 'ratio' | 'percent' | 'money';
  priorYear: number | null;
  currentQuarter: number | null;
  ytd: number | null;
  budget: number | null;
};

function safeDivide(a: number, b: number): number | null {
  return b ? a / b : null;
}

function buildAnalysisMetrics(
  balanceSheet: StatementMap,
  incomeStatement: StatementMap,
): Array<{ category: string; metrics: AnalysisMetric[] }> {
  const bs = recomputeTotals(BALANCE_SHEET_LINES, balanceSheet);
  const income = recomputeTotals(INCOME_STATEMENT_LINES, incomeStatement);

  const values = (calculate: (field: AmountKey) => number | null) => ({
    priorYear: calculate('priorYear'),
    currentQuarter: calculate('currentQuarter'),
    ytd: calculate('ytd'),
    budget: calculate('budget'),
  });
  const b = (key: string, field: AmountKey) => Number(bs[key]?.[field] ?? 0);
  const i = (key: string, field: AmountKey) => Number(income[key]?.[field] ?? 0);

  return [
    {
      category: 'Liquidity',
      metrics: [
        { label: 'Current Ratio', formula: 'Current Assets / Current Liabilities', format: 'ratio', ...values((f) => safeDivide(b('totalCurrentAssets', f), b('totalCurrentLiabilities', f))) },
        { label: 'Quick Ratio', formula: '(Current Assets − Inventory) / Current Liabilities', format: 'ratio', ...values((f) => safeDivide(b('totalCurrentAssets', f) - b('inventories', f), b('totalCurrentLiabilities', f))) },
        { label: 'Cash Ratio', formula: 'Cash / Current Liabilities', format: 'ratio', ...values((f) => safeDivide(b('cash', f), b('totalCurrentLiabilities', f))) },
        { label: 'Working Capital', formula: 'Current Assets − Current Liabilities', format: 'money', ...values((f) => b('totalCurrentAssets', f) - b('totalCurrentLiabilities', f)) },
      ],
    },
    {
      category: 'Solvency',
      metrics: [
        { label: 'Debt to Equity', formula: 'Total Liabilities / Total Equity', format: 'ratio', ...values((f) => safeDivide(b('totalLiabilities', f), b('totalEquity', f))) },
        { label: 'Debt to Assets', formula: 'Total Liabilities / Total Assets', format: 'ratio', ...values((f) => safeDivide(b('totalLiabilities', f), b('totalAssets', f))) },
        { label: 'Equity Ratio', formula: 'Total Equity / Total Assets', format: 'percent', ...values((f) => safeDivide(b('totalEquity', f), b('totalAssets', f))) },
        { label: 'Interest Coverage', formula: 'Operating Profit / Finance Costs', format: 'ratio', ...values((f) => safeDivide(i('operatingProfit', f), i('financeCosts', f))) },
        { label: 'Long-term Debt to Equity', formula: 'Non-current Liabilities / Total Equity', format: 'ratio', ...values((f) => safeDivide(b('totalNonCurrentLiabilities', f), b('totalEquity', f))) },
      ],
    },
    {
      category: 'Profitability',
      metrics: [
        { label: 'Gross Profit Margin', formula: 'Gross Profit / Revenue', format: 'percent', ...values((f) => safeDivide(i('grossProfit', f), i('totalRevenue', f))) },
        { label: 'Operating Profit Margin', formula: 'Operating Profit / Revenue', format: 'percent', ...values((f) => safeDivide(i('operatingProfit', f), i('totalRevenue', f))) },
        { label: 'Net Profit Margin', formula: 'Profit for Period / Revenue', format: 'percent', ...values((f) => safeDivide(i('profitForPeriod', f), i('totalRevenue', f))) },
        { label: 'Return on Assets', formula: 'Net Profit / Total Assets', format: 'percent', ...values((f) => safeDivide(i('profitForPeriod', f), b('totalAssets', f))) },
        { label: 'Return on Equity', formula: 'Net Profit / Total Equity', format: 'percent', ...values((f) => safeDivide(i('profitForPeriod', f), b('totalEquity', f))) },
        { label: 'Return on Capital Employed', formula: 'Operating Profit / (Assets − Current Liabilities)', format: 'percent', ...values((f) => safeDivide(i('operatingProfit', f), b('totalAssets', f) - b('totalCurrentLiabilities', f))) },
      ],
    },
  ];
}

function formatAnalysisValue(value: number | null, format: AnalysisMetric['format']): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (format === 'money') return formatRwf(value, true);
  if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(2);
}

function FinancialAnalysisTable({
  groups,
}: Readonly<{ groups: ReturnType<typeof buildAnalysisMetrics> }>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-[900px] w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            <th className="px-3 py-2.5">Ratio</th>
            <th className="px-3 py-2.5">Formula</th>
            <th className="px-2 py-2.5 text-right">Prior year</th>
            <th className="px-2 py-2.5 text-right">Current Q</th>
            <th className="px-2 py-2.5 text-right">YTD</th>
            <th className="px-2 py-2.5 text-right">Budget</th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((group) => [
            <tr key={`${group.category}-header`} className="bg-slate-50">
              <td colSpan={6} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700">{group.category} ratios</td>
            </tr>,
            ...group.metrics.map((metric) => (
              <tr key={metric.label} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-800">{metric.label}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{metric.formula}</td>
                {(['priorYear', 'currentQuarter', 'ytd', 'budget'] as const).map((field) => (
                  <td key={field} className="px-2 py-2 text-right tabular-nums">
                    {formatAnalysisValue(metric[field], metric.format)}
                  </td>
                ))}
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
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

function Stepper({
  current,
  completed,
  onJump,
}: Readonly<{
  current: number;
  completed: Set<SectionId>;
  onJump: (index: number) => void;
}>) {
  return (
    <ol className="flex flex-wrap gap-2">
      {SECTIONS.map((section, index) => {
        const done = completed.has(section.id);
        const active = index === current;
        return (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => onJump(index)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'border-rw-blue bg-rw-blue text-white'
                  : done
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {done && !active ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Circle className={`h-3.5 w-3.5 ${active ? 'fill-white/30' : ''}`} />
              )}
              {section.short}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Replace a statement map with imported amounts, keeping unknown lines empty. */
function statementFromImport(
  defs: StatementLineDef[],
  incoming: Record<string, Record<string, number>> | undefined,
): StatementMap {
  const next = initStatementMap(defs);
  for (const [key, amounts] of Object.entries(incoming ?? {})) {
    if (!(key in next)) continue;
    const row = { ...next[key] };
    for (const column of AMOUNT_COLUMNS) {
      const value = Number(amounts?.[column]);
      if (Number.isFinite(value)) row[column] = value;
    }
    next[key] = row;
  }
  return recomputeTotals(defs, next);
}

const IMPORT_TRIAL_FIELDS = TRIAL_AMOUNT_FIELDS.map(([field]) => field);

function trialBalanceFromImport(rows: ParsedFinancialPack['trialBalance']): TrialBalanceRow[] {
  if (!rows.length) return [emptyTrialBalanceRow()];
  return rows.map((row) => {
    const amounts: Record<string, number> = {};
    for (const field of IMPORT_TRIAL_FIELDS) {
      const value = Number(row.amounts?.[field]);
      if (Number.isFinite(value)) amounts[field] = value;
    }
    const mapsTo = ['Balance Sheet', 'Income Statement', 'Cash Flow'].includes(row.mapsTo)
      ? (row.mapsTo as TrialBalanceRow['mapsTo'])
      : '';
    return {
      ...emptyTrialBalanceRow(),
      ...amounts,
      glCode: row.glCode,
      accountDescription: row.accountDescription,
      noteRef: row.noteRef,
      mapsTo,
      statementRow: row.statementRow,
      source: row.source,
    };
  });
}

function kpisFromImport(
  current: KpiRow[],
  incoming: ParsedFinancialPack['operationalKpis'],
): KpiRow[] {
  if (!incoming.length) return current;
  return current.map((row) => {
    const match = incoming.find((item) => item.key === row.key);
    if (!match) return row;
    const isOther = row.label.includes('(specify)');
    const importedLabel = match.label.trim();
    return {
      ...row,
      customLabel:
        isOther && importedLabel && !/specify/i.test(importedLabel)
          ? importedLabel
          : row.customLabel,
      priorYear: match.priorYear || row.priorYear,
      currentQuarter: match.current || row.currentQuarter,
      ytd: match.ytd || match.current || row.ytd,
      target: match.target || row.target,
      notes: match.notes || row.notes,
    };
  });
}

export function QuarterlyReportForm({
  user,
  companies,
  defaultCompanyId,
  busy,
  setBusy,
  onCreated,
}: Readonly<{
  user: AuthUser;
  companies: CompanyOption[];
  defaultCompanyId: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onCreated: () => Promise<void>;
}>) {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<SectionId>>(new Set());
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const selectedCompany = companies.find((c) => c.id === companyId);

  const [cover, setCover] = useState<QuarterlyCover>(() => ({
    companyId: defaultCompanyId,
    companyName: companies.find((c) => c.id === defaultCompanyId)?.name ?? '',
    sector: companies.find((c) => c.id === defaultCompanyId)?.sector ?? '',
    reportingPeriod: 'Q2 2026',
    preparedByName: user.fullName ?? '',
    preparedByTitle: user.title ?? '',
    preparedByDate: new Date().toISOString().slice(0, 10),
    authorizedByName: '',
    authorizedByTitle: '',
    authorizedByDate: '',
  }));

  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([emptyTrialBalanceRow()]);
  const [balanceSheet, setBalanceSheet] = useState(() => initStatementMap(BALANCE_SHEET_LINES));
  const [incomeStatement, setIncomeStatement] = useState(() =>
    initStatementMap(INCOME_STATEMENT_LINES),
  );
  const [cashFlow, setCashFlow] = useState(() => initStatementMap(CASH_FLOW_LINES));
  const [changesInEquity, setChangesInEquity] = useState(() => initStatementMap(EQUITY_LINES));
  const [balanceSheetNotes, setBalanceSheetNotes] = useState(() =>
    initDisclosureNotes(BALANCE_SHEET_LINES),
  );
  const [incomeStatementNotes, setIncomeStatementNotes] = useState(() =>
    initDisclosureNotes(INCOME_STATEMENT_LINES),
  );
  const [analysisComments, setAnalysisComments] = useState<FinancialAnalysisComments>({
    ...EMPTY_ANALYSIS_COMMENTS,
  });
  const [operationalKpis, setOperationalKpis] = useState(() => emptyKpiRows(OPERATIONAL_KPIS));
  const [governanceKpis, setGovernanceKpis] = useState(() => emptyKpiRows(GOVERNANCE_KPIS));
  const [docs, setDocs] = useState({
    signedFinancialStatements: false,
    boardMinutes: false,
    otherReports: false,
  });
  const [supportingFiles, setSupportingFiles] = useState<{
    signedFinancialStatements: File | null;
    boardMinutes: File | null;
    otherReports: File | null;
  }>({
    signedFinancialStatements: null,
    boardMinutes: null,
    otherReports: null,
  });

  const payloadPreview = useMemo(
    () =>
      buildQuarterlyPayload({
        cover: {
          ...cover,
          companyId,
          companyName: selectedCompany?.name ?? cover.companyName,
          sector: selectedCompany?.sector ?? cover.sector,
          reportingPeriod: cover.reportingPeriod,
        },
        trialBalance,
        balanceSheet,
        incomeStatement,
        cashFlow,
        changesInEquity,
        balanceSheetNotes,
        incomeStatementNotes,
        financialAnalysisComments: analysisComments,
        operationalKpis,
        governanceKpis,
        documentChecklist: docs,
      }),
    [
      cover,
      companyId,
      selectedCompany,
      trialBalance,
      balanceSheet,
      incomeStatement,
      cashFlow,
      changesInEquity,
      balanceSheetNotes,
      incomeStatementNotes,
      analysisComments,
      operationalKpis,
      governanceKpis,
      docs,
    ],
  );

  const ratios = useMemo(
    () => computeFinancialRatios(payloadPreview.financialStatements),
    [payloadPreview.financialStatements],
  );
  const analysisGroups = useMemo(
    () => buildAnalysisMetrics(balanceSheet, incomeStatement),
    [balanceSheet, incomeStatement],
  );

  const bsBalanced = useMemo(() => {
    const bs = recomputeTotals(BALANCE_SHEET_LINES, balanceSheet);
    const assets = Number(bs.totalAssets?.currentQuarter ?? 0);
    const equityLiab = Number(bs.totalEquityAndLiabilities?.currentQuarter ?? 0);
    if (!assets && !equityLiab) return true;
    return Math.abs(assets - equityLiab) < 1;
  }, [balanceSheet]);

  const trialBalanceCheck = useMemo(() => {
    const activeRows = trialBalance.filter(
      (row) => row.glCode.trim() || row.accountDescription.trim(),
    );
    const debit = activeRows.reduce((sum, row) => sum + row.currentQuarterDebit, 0);
    const credit = activeRows.reduce((sum, row) => sum + row.currentQuarterCredit, 0);
    return {
      rowCount: activeRows.length,
      debit,
      credit,
      balanced: activeRows.length === 0 || Math.abs(debit - credit) < 1,
    };
  }, [trialBalance]);

  const completeness = useMemo(() => {
    const enteredLines = (defs: StatementLineDef[], map: StatementMap) =>
      defs.filter(
        (def) =>
          def.kind === 'line' &&
          Object.values(map[def.key] ?? {}).some((value) => Number(value) !== 0),
      ).length;
    const completedNotes = (rows: DisclosureNoteRow[]) =>
      rows.filter(
        (row) =>
          row.currentQuarter.trim() ||
          row.ytd.trim() ||
          row.budget.trim() ||
          row.disclosure.trim() ||
          row.supportingSchedule.trim(),
      ).length;
    const assessedKpis = [...operationalKpis, ...governanceKpis].filter(
      (row) => row.target.trim() && (row.ytd.trim() || row.currentQuarter.trim()),
    ).length;
    return {
      balanceLines: enteredLines(BALANCE_SHEET_LINES, balanceSheet),
      incomeLines: enteredLines(INCOME_STATEMENT_LINES, incomeStatement),
      cashFlowLines: enteredLines(CASH_FLOW_LINES, cashFlow),
      equityLines: enteredLines(EQUITY_LINES, changesInEquity),
      balanceNotes: completedNotes(balanceSheetNotes),
      incomeNotes: completedNotes(incomeStatementNotes),
      assessedKpis,
    };
  }, [
    balanceSheet,
    incomeStatement,
    cashFlow,
    changesInEquity,
    balanceSheetNotes,
    incomeStatementNotes,
    operationalKpis,
    governanceKpis,
  ]);

  const markComplete = (id: SectionId) => {
    setCompleted((prev) => new Set(prev).add(id));
  };

  const validateCover = (): string | null => {
    if (!companyId) return 'Select a company';
    if (!cover.reportingPeriod.trim()) return 'Enter the reporting period (e.g. Q2 2026)';
    if (!cover.preparedByName.trim()) return 'Enter prepared-by name on the cover';
    return null;
  };

  const goNext = () => {
    const section = SECTIONS[step];
    if (section.id === 'cover') {
      const err = validateCover();
      if (err) {
        toast.error(err);
        return;
      }
    }
    if (section.id === 'balance' && !bsBalanced) {
      toast.error(
        'Balance sheet does not balance yet (Total Assets ≠ Equity + Liabilities). You can continue, but it must balance before saving.',
      );
    }
    if (
      section.id === 'trial' &&
      (trialBalanceCheck.rowCount === 0 || !trialBalanceCheck.balanced)
    ) {
      toast.error(
        trialBalanceCheck.rowCount === 0
          ? 'No trial balance accounts have been entered yet. You can continue and return later.'
          : 'Current-quarter trial balance debits and credits do not agree yet.',
      );
    }
    markComplete(section.id);
    setStep((s) => Math.min(s + 1, SECTIONS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const saveDraft = async () => {
    const err = validateCover();
    if (err) {
      toast.error(err);
      setStep(0);
      return;
    }
    if (!bsBalanced) {
      toast.error('Balance sheet does not balance. Fix Total Assets vs Equity + Liabilities.');
      setStep(2);
      return;
    }

    setBusy(true);
    try {
      const payload = buildQuarterlyPayload({
        cover: {
          ...cover,
          companyId,
          companyName: selectedCompany?.name ?? cover.companyName,
          sector: selectedCompany?.sector ?? cover.sector,
        },
        trialBalance,
        balanceSheet,
        incomeStatement,
        cashFlow,
        changesInEquity,
        balanceSheetNotes,
        incomeStatementNotes,
        financialAnalysisComments: analysisComments,
        operationalKpis,
        governanceKpis,
        documentChecklist: docs,
      });

      const created = await submissionsApi.create({
        companyId,
        type: 'quarterly_report',
        title: `Quarterly Report — ${cover.reportingPeriod}`,
        period: cover.reportingPeriod,
        payload: payload as unknown as Record<string, unknown>,
      });

      const uploads: Array<{
        file: File;
        name: string;
        category: StoredDocumentCategory;
      }> = [];
      if (supportingFiles.signedFinancialStatements) {
        uploads.push({
          file: supportingFiles.signedFinancialStatements,
          name: 'Signed financial statements',
          category: 'signed_financial_statements',
        });
      }
      if (supportingFiles.boardMinutes) {
        uploads.push({
          file: supportingFiles.boardMinutes,
          name: 'Board minutes',
          category: 'board_minutes',
        });
      }
      if (supportingFiles.otherReports) {
        uploads.push({
          file: supportingFiles.otherReports,
          name: 'Other shareholder reports',
          category: 'other',
        });
      }

      if (uploads.length) {
        const uploadedDocuments = await Promise.all(
          uploads.map(async (item) => {
            const form = new FormData();
            form.append('file', item.file);
            form.append('companyId', companyId);
            form.append('submissionId', created.data.id);
            form.append('name', item.name);
            form.append('category', item.category);
            return (await documentsApi.upload(form)).data;
          }),
        );
        await submissionsApi.update(created.data.id, {
          payload: {
            ...payload,
            attachedDocuments: uploadedDocuments.map((document) => ({
              id: document.id,
              name: document.name,
              category: document.category,
              sizeBytes: document.sizeBytes,
            })),
          },
        });
      }

      SECTIONS.forEach((s) => markComplete(s.id));
      await onCreated();
      toast.success('Quarterly draft saved — open Submissions & Approvals to submit for review');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save quarterly draft');
    } finally {
      setBusy(false);
    }
  };

  const applyImportedPack = (pack: ParsedFinancialPack) => {
    setCover((prev) => ({
      ...prev,
      companyName: pack.cover.companyName || prev.companyName,
      sector: pack.cover.sector || prev.sector,
      reportingPeriod: pack.cover.reportingPeriod || prev.reportingPeriod,
    }));
    setBalanceSheet(statementFromImport(BALANCE_SHEET_LINES, pack.balanceSheet));
    setIncomeStatement(statementFromImport(INCOME_STATEMENT_LINES, pack.incomeStatement));
    setCashFlow(statementFromImport(CASH_FLOW_LINES, pack.cashFlow));
    setChangesInEquity(statementFromImport(EQUITY_LINES, pack.changesInEquity));
    setTrialBalance(trialBalanceFromImport(pack.trialBalance));
    setOperationalKpis((prev) => kpisFromImport(prev, pack.operationalKpis));
    setGovernanceKpis((prev) => kpisFromImport(prev, pack.governanceKpis));
  };

  const current = SECTIONS[step];

  return (
    <Panel>
      <PanelHeader
        title="Business Process 4 — Quarterly Financial Report"
        description="Complete each section of the MINECOFIN quarterly financial statements pack. Totals and ratios calculate automatically."
      />
      <PanelBody className="space-y-6">
        <FinancialPackImportPanel
          mode="quarterly"
          templateFileName="Quarterly Financial statements template.xlsx"
          onParsed={applyImportedPack}
          disabled={busy}
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">
              Section {step + 1} of {SECTIONS.length}: {current.label}
            </p>
            <p className="text-xs text-slate-500">
              {completed.size}/{SECTIONS.length} sections marked complete
            </p>
          </div>
          <Stepper current={step} completed={completed} onJump={setStep} />
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-rw-blue transition-all"
              style={{ width: `${((step + 1) / SECTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        {current.id === 'cover' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Cover sheet — identify the company, reporting period, and signatories before entering
              statement figures.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {!user.companyId && (
                <label className="block text-sm">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Company
                  </span>
                  <select
                    value={companyId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCompanyId(id);
                      const c = companies.find((x) => x.id === id);
                      setCover((prev) => ({
                        ...prev,
                        companyId: id,
                        companyName: c?.name ?? '',
                        sector: c?.sector ?? '',
                      }));
                    }}
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
                label="Reporting period"
                value={cover.reportingPeriod}
                onChange={(v) => setCover({ ...cover, reportingPeriod: v })}
                placeholder="Q2 2026"
              />
              <Field
                label="Sector"
                value={cover.sector}
                onChange={(v) => setCover({ ...cover, sector: v })}
              />
              <Field
                label="Prepared by — name"
                value={cover.preparedByName}
                onChange={(v) => setCover({ ...cover, preparedByName: v })}
              />
              <Field
                label="Prepared by — title"
                value={cover.preparedByTitle}
                onChange={(v) => setCover({ ...cover, preparedByTitle: v })}
              />
              <Field
                label="Prepared by — date"
                value={cover.preparedByDate}
                onChange={(v) => setCover({ ...cover, preparedByDate: v })}
                type="date"
              />
              <Field
                label="Authorized by — name"
                value={cover.authorizedByName}
                onChange={(v) => setCover({ ...cover, authorizedByName: v })}
              />
              <Field
                label="Authorized by — title"
                value={cover.authorizedByTitle}
                onChange={(v) => setCover({ ...cover, authorizedByTitle: v })}
              />
              <Field
                label="Authorized by — date"
                value={cover.authorizedByDate}
                onChange={(v) => setCover({ ...cover, authorizedByDate: v })}
                type="date"
              />
            </div>
          </div>
        )}

        {current.id === 'trial' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-600">
                  Detailed Trial Balance — enter each GL account, debit/credit amounts, statement
                  mapping, and source exactly as supported by your ledger.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Amounts use the same practical reporting columns as the statement forms.
                </p>
              </div>
              <div
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  trialBalanceCheck.balanced
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                Current Q: Debit {formatRwf(trialBalanceCheck.debit, true)} · Credit{' '}
                {formatRwf(trialBalanceCheck.credit, true)} ·{' '}
                {trialBalanceCheck.balanced ? 'Balanced' : 'Out of balance'}
              </div>
            </div>
            <TrialBalanceTable rows={trialBalance} onChange={setTrialBalance} />
          </div>
        )}

        {current.id === 'balance' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Statement of Financial Position — enter line amounts; totals and variance calculate
              automatically. Assets must equal Equity + Liabilities.
            </p>
            {!bsBalanced && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Balance sheet is out of balance for the current quarter. Adjust lines until Total
                Assets equals Total Equity and Liabilities.
              </div>
            )}
            <StatementTable
              defs={BALANCE_SHEET_LINES}
              map={balanceSheet}
              onChange={setBalanceSheet}
              hint="Enter absolute amounts. Cost/expense lines on other statements use positives that subtract into totals."
            />
          </div>
        )}

        {current.id === 'income' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Statement of Profit or Loss — revenue, costs, and expenses by line. Gross profit and
              period profit are computed for you.
            </p>
            <StatementTable
              defs={INCOME_STATEMENT_LINES}
              map={incomeStatement}
              onChange={setIncomeStatement}
              hint="Enter costs and expenses as positive numbers — they are subtracted when computing profit totals."
            />
          </div>
        )}

        {current.id === 'cashflow' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Statement of Cash Flows — operating, investing, and financing activities.
            </p>
            <StatementTable
              defs={CASH_FLOW_LINES}
              map={cashFlow}
              onChange={setCashFlow}
              hint="Enter cash outflows (purchases, repayments, dividends paid) as negative amounts."
            />
          </div>
        )}

        {current.id === 'equity' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Statement of Changes in Equity — opening balance through closing equity for the
              period.
            </p>
            <StatementTable
              defs={EQUITY_LINES}
              map={changesInEquity}
              onChange={setChangesInEquity}
              hint="Enter dividends as a positive amount — they are deducted from closing equity."
            />
          </div>
        )}

        {current.id === 'bsnotes' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Notes to the Statement of Financial Position — provide the amount, disclosure,
              measurement basis, movement, and supporting schedule for each applicable note.
            </p>
            <DisclosureNotesTable rows={balanceSheetNotes} onChange={setBalanceSheetNotes} />
          </div>
        )}

        {current.id === 'isnotes' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Notes to the Statement of Profit or Loss — explain revenue, cost, operating-expense,
              finance, and tax balances with their supporting schedules.
            </p>
            <DisclosureNotesTable rows={incomeStatementNotes} onChange={setIncomeStatementNotes} />
          </div>
        )}

        {current.id === 'analysis' && (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-slate-600">
                Financial Analysis Dashboard — liquidity, solvency, and profitability ratios are
                derived automatically from the statements.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Prior-year values provide the comparative baseline; YTD shows cumulative
                performance and Budget provides the target.
              </p>
            </div>
            <FinancialAnalysisTable groups={analysisGroups} />
            <div className="grid gap-4 lg:grid-cols-2">
              {(
                [
                  ['Liquidity observations', 'liquidityObservations'],
                  ['Liquidity management actions', 'liquidityActions'],
                  ['Solvency observations', 'solvencyObservations'],
                  ['Solvency management actions', 'solvencyActions'],
                  ['Profitability observations', 'profitabilityObservations'],
                  ['Profitability management actions', 'profitabilityActions'],
                  ['Strategic outlook', 'strategicOutlook'],
                  ['Strategic action items', 'strategicActions'],
                ] as const
              ).map(([label, key]) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {label}
                  </span>
                  <textarea
                    value={analysisComments[key]}
                    onChange={(e) =>
                      setAnalysisComments((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20"
                    placeholder="Enter management observations or recommended actions…"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {current.id === 'kpis' && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Section 1 — Operational Key Performance Indicators
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Enter prior-year comparison, current quarter, YTD/latest and target. Status and
                variance calculate consistently.
              </p>
            </div>
            <KpiTable rows={operationalKpis} onChange={setOperationalKpis} allowCustomLabel />
            <div className="border-t border-slate-200 pt-5">
              <p className="text-sm font-semibold text-slate-900">
                Section 2 — Governance Key Performance Indicators
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Governance now uses the same table, fields, status rules, and visual styling as
                operational KPIs.
              </p>
            </div>
            <KpiTable rows={governanceKpis} onChange={setGovernanceKpis} allowCustomLabel />
          </div>
        )}

        {current.id === 'review' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Completeness and control checks</h3>
              <p className="mt-1 text-xs text-slate-500">
                Review every workbook-equivalent section before saving the draft.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: 'Cover information',
                    ok: !validateCover(),
                    detail: validateCover() ?? 'Required identification is present',
                  },
                  {
                    label: 'Trial Balance',
                    ok: trialBalanceCheck.rowCount > 0 && trialBalanceCheck.balanced,
                    detail:
                      trialBalanceCheck.rowCount === 0
                        ? 'No account rows entered'
                        : `${trialBalanceCheck.rowCount} accounts; ${
                            trialBalanceCheck.balanced ? 'debits equal credits' : 'out of balance'
                          }`,
                  },
                  {
                    label: 'Balance Sheet control',
                    ok: bsBalanced && completeness.balanceLines > 0,
                    detail: `${completeness.balanceLines} lines entered; ${
                      bsBalanced ? 'balanced' : 'assets do not equal equity + liabilities'
                    }`,
                  },
                  {
                    label: 'Income Statement',
                    ok: completeness.incomeLines > 0,
                    detail: `${completeness.incomeLines} statement lines entered`,
                  },
                  {
                    label: 'Cash Flow Statement',
                    ok: completeness.cashFlowLines > 0,
                    detail: `${completeness.cashFlowLines} statement lines entered`,
                  },
                  {
                    label: 'Changes in Equity',
                    ok: completeness.equityLines > 0,
                    detail: `${completeness.equityLines} statement lines entered`,
                  },
                  {
                    label: 'Balance Sheet Notes',
                    ok: completeness.balanceNotes > 0,
                    detail: `${completeness.balanceNotes}/${balanceSheetNotes.length} applicable notes completed`,
                  },
                  {
                    label: 'Income Statement Notes',
                    ok: completeness.incomeNotes > 0,
                    detail: `${completeness.incomeNotes}/${incomeStatementNotes.length} applicable notes completed`,
                  },
                  {
                    label: 'Financial Analysis',
                    ok: Object.values(analysisComments).some((value) => value.trim()),
                    detail: `${Object.values(analysisComments).filter((value) => value.trim()).length}/8 management comment fields completed`,
                  },
                  {
                    label: 'Other KPIs Dashboard',
                    ok: completeness.assessedKpis > 0,
                    detail: `${completeness.assessedKpis}/20 KPIs assessed against targets`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-start gap-2 rounded-lg border p-3 ${
                      item.ok
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    {item.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-600">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Key financial highlights
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <RatioTile
                  label="Revenue"
                  value={formatRwf(payloadPreview.financialStatements.revenue, true)}
                />
                <RatioTile
                  label="Total assets"
                  value={formatRwf(
                    payloadPreview.financialStatements.currentAssets +
                      payloadPreview.financialStatements.nonCurrentAssets,
                    true,
                  )}
                />
                <RatioTile
                  label="Total equity"
                  value={formatRwf(payloadPreview.financialStatements.equity, true)}
                />
                <RatioTile
                  label="Operating cash flow"
                  value={formatRwf(
                    payloadPreview.financialStatements.operatingCashFlow,
                    true,
                  )}
                />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-900">Ratio summary</h3>
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <RatioTile label="Gross profit" value={formatRwf(ratios.grossProfit, true)} />
              <RatioTile label="EBITDA" value={formatRwf(ratios.ebitda, true)} />
              <RatioTile label="Net income" value={formatRwf(ratios.netIncome, true)} />
              <RatioTile label="Current ratio" value={ratios.currentRatio?.toFixed(2) ?? '—'} />
              <RatioTile
                label="Gross margin"
                value={ratios.grossMarginPct != null ? `${ratios.grossMarginPct}%` : '—'}
              />
              <RatioTile
                label="EBITDA margin"
                value={ratios.ebitdaMarginPct != null ? `${ratios.ebitdaMarginPct}%` : '—'}
              />
              <RatioTile
                label="ROE"
                value={ratios.returnOnEquityPct != null ? `${ratios.returnOnEquityPct}%` : '—'}
              />
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

            <div className="space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Document checklist
              </p>
              {(
                [
                  ['signedFinancialStatements', 'Signed financial statements attached'],
                  ['boardMinutes', 'Board minutes (previous quarter) attached'],
                  ['otherReports', 'Other shareholder reports attached'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={docs[key]}
                    onChange={(e) => setDocs({ ...docs, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <SupportingFileField
                label="Signed financial statements"
                description="PDF or Office file of the signed pack"
                file={supportingFiles.signedFinancialStatements}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(file) =>
                  setSupportingFiles((prev) => ({ ...prev, signedFinancialStatements: file }))
                }
              />
              <SupportingFileField
                label="Board minutes"
                description="Minutes supporting the reporting period"
                file={supportingFiles.boardMinutes}
                accept=".pdf,.doc,.docx"
                onChange={(file) =>
                  setSupportingFiles((prev) => ({ ...prev, boardMinutes: file }))
                }
              />
              <SupportingFileField
                label="Other reports"
                description="Optional supporting shareholder reports"
                file={supportingFiles.otherReports}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(file) =>
                  setSupportingFiles((prev) => ({ ...prev, otherReports: file }))
                }
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Ready to save?</p>
              <p className="mt-1">
                Saving creates a draft submission with the full statement pack. You can still edit
                before submitting through Submissions & Approvals.
              </p>
              {!docs.signedFinancialStatements && (
                <p className="mt-2 text-amber-800">
                  Tip: tick the checklist and attach signed statements when available.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" disabled={step === 0 || busy} onClick={goBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous section
          </Button>
          <div className="flex flex-wrap gap-2">
            {step < SECTIONS.length - 1 ? (
              <Button type="button" disabled={busy} onClick={goNext}>
                Next section
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" disabled={busy || !companyId} onClick={() => void saveDraft()}>
                {busy ? 'Saving…' : 'Save quarterly draft'}
              </Button>
            )}
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}
