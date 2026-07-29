/**
 * Annual Financial Reporting Template schema —
 * mirrors the MINECOFIN "Annual Financial statements template.xlsx" pack
 * (Cover, Trial Balance, Balance Sheet, Income Statement, Cash Flow,
 * Changes in Equity, BS Notes, IS Notes, Financial Analysis, Other KPIs).
 *
 * Statement line definitions are shared with the quarterly pack; only the
 * amount columns differ (three comparative years plus the current-year budget).
 */

import {
  BALANCE_SHEET_LINES,
  CASH_FLOW_LINES,
  EQUITY_LINES,
  GOVERNANCE_KPIS,
  INCOME_STATEMENT_LINES,
  OPERATIONAL_KPIS,
  type KpiDef,
  type LineKind,
  type StatementLineDef,
} from './quarterlyReportSchema';

export {
  BALANCE_SHEET_LINES,
  CASH_FLOW_LINES,
  EQUITY_LINES,
  GOVERNANCE_KPIS,
  INCOME_STATEMENT_LINES,
  OPERATIONAL_KPIS,
};
export type { KpiDef, LineKind, StatementLineDef };

export type AnnualAmountKey = 'prior2Year' | 'priorYear' | 'currentYear' | 'budget';

export const ANNUAL_AMOUNT_COLUMNS: AnnualAmountKey[] = [
  'prior2Year',
  'priorYear',
  'currentYear',
  'budget',
];

export interface AnnualAmountRow {
  prior2Year: number;
  priorYear: number;
  currentYear: number;
  budget: number;
}

export const EMPTY_ANNUAL_AMOUNT: AnnualAmountRow = {
  prior2Year: 0,
  priorYear: 0,
  currentYear: 0,
  budget: 0,
};

export function emptyAnnualAmount(): AnnualAmountRow {
  return { ...EMPTY_ANNUAL_AMOUNT };
}

/** Budget vs current-year actual */
export function annualVariance(row: AnnualAmountRow): number {
  return Number(row.budget || 0) - Number(row.currentYear || 0);
}

export type AnnualStatementMap = Record<string, AnnualAmountRow>;

export function initAnnualStatementMap(defs: StatementLineDef[]): AnnualStatementMap {
  const map: AnnualStatementMap = {};
  for (const def of defs) {
    if (def.kind === 'header') continue;
    map[def.key] = emptyAnnualAmount();
  }
  return map;
}

export function sumAnnualRows(rows: AnnualAmountRow[]): AnnualAmountRow {
  return rows.reduce(
    (acc, row) => ({
      prior2Year: acc.prior2Year + Number(row.prior2Year || 0),
      priorYear: acc.priorYear + Number(row.priorYear || 0),
      currentYear: acc.currentYear + Number(row.currentYear || 0),
      budget: acc.budget + Number(row.budget || 0),
    }),
    emptyAnnualAmount(),
  );
}

function subtractAnnualRows(base: AnnualAmountRow, less: AnnualAmountRow[]): AnnualAmountRow {
  return less.reduce(
    (acc, row) => ({
      prior2Year: acc.prior2Year - Number(row.prior2Year || 0),
      priorYear: acc.priorYear - Number(row.priorYear || 0),
      currentYear: acc.currentYear - Number(row.currentYear || 0),
      budget: acc.budget - Number(row.budget || 0),
    }),
    { ...base },
  );
}

/** Recompute total/subtotal rows from editable lines. */
export function recomputeAnnualTotals(
  defs: StatementLineDef[],
  map: AnnualStatementMap,
): AnnualStatementMap {
  const next: AnnualStatementMap = { ...map };
  for (const def of defs) {
    if (def.kind !== 'total' && def.kind !== 'subtotal') continue;
    const added = sumAnnualRows((def.sumOf ?? []).map((key) => next[key] ?? emptyAnnualAmount()));
    next[def.key] = subtractAnnualRows(
      added,
      (def.lessOf ?? []).map((key) => next[key] ?? emptyAnnualAmount()),
    );
  }
  return next;
}

export interface AnnualTrialBalanceRow {
  id: string;
  glCode: string;
  accountDescription: string;
  noteRef: string;
  prior2YearDebit: number;
  prior2YearCredit: number;
  priorYearDebit: number;
  priorYearCredit: number;
  currentYearDebit: number;
  currentYearCredit: number;
  budgetDebit: number;
  budgetCredit: number;
  mapsTo: 'Balance Sheet' | 'Income Statement' | 'Cash Flow' | '';
  statementRow: string;
  source: string;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tb-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function emptyAnnualTrialBalanceRow(): AnnualTrialBalanceRow {
  return {
    id: newId(),
    glCode: '',
    accountDescription: '',
    noteRef: '',
    prior2YearDebit: 0,
    prior2YearCredit: 0,
    priorYearDebit: 0,
    priorYearCredit: 0,
    currentYearDebit: 0,
    currentYearCredit: 0,
    budgetDebit: 0,
    budgetCredit: 0,
    mapsTo: '',
    statementRow: '',
    source: '',
  };
}

export interface AnnualDisclosureNoteRow {
  ref: string;
  title: string;
  priorYear: string;
  currentYear: string;
  budget: string;
  disclosure: string;
  supportingSchedule: string;
}

export function initAnnualDisclosureNotes(defs: StatementLineDef[]): AnnualDisclosureNoteRow[] {
  const notes = new Map<string, string>();
  for (const def of defs) {
    if (def.note && !notes.has(def.note)) notes.set(def.note, def.label);
  }
  return Array.from(notes, ([ref, title]) => ({
    ref,
    title,
    priorYear: '',
    currentYear: '',
    budget: '',
    disclosure: '',
    supportingSchedule: '',
  }));
}

export interface AnnualAnalysisComments {
  liquidityObservations: string;
  liquidityActions: string;
  solvencyObservations: string;
  solvencyActions: string;
  profitabilityObservations: string;
  profitabilityActions: string;
  strategicOutlook: string;
  strategicActions: string;
}

export const EMPTY_ANNUAL_ANALYSIS_COMMENTS: AnnualAnalysisComments = {
  liquidityObservations: '',
  liquidityActions: '',
  solvencyObservations: '',
  solvencyActions: '',
  profitabilityObservations: '',
  profitabilityActions: '',
  strategicOutlook: '',
  strategicActions: '',
};

export interface AnnualKpiRow {
  key: string;
  label: string;
  customLabel: string;
  priorYear: string;
  currentYear: string;
  target: string;
  notes: string;
}

export function emptyAnnualKpiRows(defs: KpiDef[]): AnnualKpiRow[] {
  return defs.map((d) => ({
    key: d.key,
    label: d.label,
    customLabel: '',
    priorYear: '',
    currentYear: '',
    target: '',
    notes: d.notes ?? '',
  }));
}

export interface AnnualCover {
  companyId: string;
  companyName: string;
  sector: string;
  /** Reporting financial year, e.g. "2026" */
  financialYear: string;
  preparedByName: string;
  preparedByTitle: string;
  preparedByDate: string;
  authorizedByName: string;
  authorizedByTitle: string;
  authorizedByDate: string;
}

/** Column headings derived from the cover financial year (2024/2025/2026 Actual + Budget). */
export function annualColumnLabels(financialYear: string): Record<AnnualAmountKey, string> {
  const year = Number(String(financialYear).match(/\d{4}/)?.[0]);
  if (!Number.isFinite(year)) {
    return {
      prior2Year: 'Prior year −2 actual',
      priorYear: 'Prior year actual',
      currentYear: 'Current year actual',
      budget: 'Current year budget',
    };
  }
  return {
    prior2Year: `${year - 2} Actual`,
    priorYear: `${year - 1} Actual`,
    currentYear: `${year} Actual`,
    budget: `${year} Budget`,
  };
}

export interface AnnualReportPayload {
  templateVersion: 'annual_fs_v1';
  cover: AnnualCover;
  trialBalance: AnnualTrialBalanceRow[];
  balanceSheet: AnnualStatementMap;
  incomeStatement: AnnualStatementMap;
  cashFlow: AnnualStatementMap;
  changesInEquity: AnnualStatementMap;
  balanceSheetNotes: AnnualDisclosureNoteRow[];
  incomeStatementNotes: AnnualDisclosureNoteRow[];
  financialAnalysisComments: AnnualAnalysisComments;
  operationalKpis: AnnualKpiRow[];
  governanceKpis: AnnualKpiRow[];
  documentChecklist: {
    signedFinancialStatements: boolean;
    boardMinutes: boolean;
    otherReports: boolean;
  };
  /** Aggregates kept for ratios / Reports Centre compatibility */
  financialStatements: {
    revenue: number;
    costOfSales: number;
    operatingExpenses: number;
    interestExpense: number;
    taxExpense: number;
    currentAssets: number;
    nonCurrentAssets: number;
    currentLiabilities: number;
    nonCurrentLiabilities: number;
    equity: number;
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
  };
  operationalMetrics: {
    metric1: string;
    metric2: string;
    notes: string;
  };
  governanceMetrics: {
    boardMeetingsHeld: string;
    governanceScore: string;
    notes: string;
  };
}

function amt(map: AnnualStatementMap, key: string, field: AnnualAmountKey): number {
  return Number(map[key]?.[field] ?? 0);
}

export function deriveAnnualFinancialStatements(
  balanceSheet: AnnualStatementMap,
  incomeStatement: AnnualStatementMap,
  cashFlow: AnnualStatementMap,
  field: AnnualAmountKey = 'currentYear',
): AnnualReportPayload['financialStatements'] {
  const bs = recomputeAnnualTotals(BALANCE_SHEET_LINES, balanceSheet);
  const is = recomputeAnnualTotals(INCOME_STATEMENT_LINES, incomeStatement);
  const cf = recomputeAnnualTotals(CASH_FLOW_LINES, cashFlow);

  return {
    revenue: amt(is, 'totalRevenue', field),
    costOfSales: Math.abs(amt(is, 'totalCostOfSales', field)),
    operatingExpenses: Math.abs(amt(is, 'totalOperatingExpenses', field)),
    interestExpense: Math.abs(amt(is, 'financeCosts', field)),
    taxExpense: Math.abs(amt(is, 'incomeTaxExpense', field)),
    currentAssets: amt(bs, 'totalCurrentAssets', field),
    nonCurrentAssets: amt(bs, 'totalNonCurrentAssets', field),
    currentLiabilities: amt(bs, 'totalCurrentLiabilities', field),
    nonCurrentLiabilities: amt(bs, 'totalNonCurrentLiabilities', field),
    equity: amt(bs, 'totalEquity', field),
    operatingCashFlow: amt(cf, 'netOperatingCash', field),
    investingCashFlow: amt(cf, 'netInvestingCash', field),
    financingCashFlow: amt(cf, 'netFinancingCash', field),
  };
}

export function buildAnnualPayload(input: {
  cover: AnnualCover;
  trialBalance: AnnualTrialBalanceRow[];
  balanceSheet: AnnualStatementMap;
  incomeStatement: AnnualStatementMap;
  cashFlow: AnnualStatementMap;
  changesInEquity: AnnualStatementMap;
  balanceSheetNotes: AnnualDisclosureNoteRow[];
  incomeStatementNotes: AnnualDisclosureNoteRow[];
  financialAnalysisComments: AnnualAnalysisComments;
  operationalKpis: AnnualKpiRow[];
  governanceKpis: AnnualKpiRow[];
  documentChecklist: AnnualReportPayload['documentChecklist'];
}): AnnualReportPayload {
  const balanceSheet = recomputeAnnualTotals(BALANCE_SHEET_LINES, input.balanceSheet);
  const incomeStatement = recomputeAnnualTotals(INCOME_STATEMENT_LINES, input.incomeStatement);
  const cashFlow = recomputeAnnualTotals(CASH_FLOW_LINES, input.cashFlow);
  const changesInEquity = recomputeAnnualTotals(EQUITY_LINES, input.changesInEquity);
  const financialStatements = deriveAnnualFinancialStatements(
    balanceSheet,
    incomeStatement,
    cashFlow,
  );

  const op1 = input.operationalKpis.find((k) => k.key === 'OP-1');
  const op2 = input.operationalKpis.find((k) => k.key === 'OP-2');
  const gv1 = input.governanceKpis.find((k) => k.key === 'GV-1');
  const gv3 = input.governanceKpis.find((k) => k.key === 'GV-3');

  return {
    templateVersion: 'annual_fs_v1',
    cover: input.cover,
    trialBalance: input.trialBalance,
    balanceSheet,
    incomeStatement,
    cashFlow,
    changesInEquity,
    balanceSheetNotes: input.balanceSheetNotes,
    incomeStatementNotes: input.incomeStatementNotes,
    financialAnalysisComments: input.financialAnalysisComments,
    operationalKpis: input.operationalKpis,
    governanceKpis: input.governanceKpis,
    documentChecklist: input.documentChecklist,
    financialStatements,
    operationalMetrics: {
      metric1: op1?.currentYear || op1?.priorYear || '',
      metric2: op2?.currentYear || op2?.priorYear || '',
      notes: input.operationalKpis
        .filter((k) => k.notes.trim())
        .map((k) => `${k.key}: ${k.notes}`)
        .join('; '),
    },
    governanceMetrics: {
      boardMeetingsHeld: gv1?.currentYear || gv1?.priorYear || '',
      governanceScore: gv3?.currentYear || gv3?.priorYear || '',
      notes: input.governanceKpis
        .filter((k) => k.notes.trim())
        .map((k) => `${k.key}: ${k.notes}`)
        .join('; '),
    },
  };
}
