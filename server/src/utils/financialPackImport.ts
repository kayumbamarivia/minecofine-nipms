import * as XLSX from 'xlsx';

/**
 * Parses a filled MINECOFIN financial statements workbook (annual or quarterly)
 * into the statement maps used by the reporting forms.
 *
 * Cell values are read from the workbook's cached results, so formula-driven
 * templates import correctly as long as they were last saved by Excel /
 * LibreOffice. Cells that only hold an unevaluated formula are skipped and
 * reported through `warnings`; the preparer can then type those lines manually.
 *
 * The line definitions below intentionally duplicate the front-end schema
 * (src/utils/quarterlyReportSchema.ts) so the API has no build-time dependency
 * on client code.
 */

export type PackMode = 'annual' | 'quarterly';

export type AnnualAmountKey = 'prior2Year' | 'priorYear' | 'currentYear' | 'budget';
export type QuarterlyAmountKey = 'priorYear' | 'currentQuarter' | 'ytd' | 'budget';
type AmountKey = AnnualAmountKey | QuarterlyAmountKey;

const ANNUAL_KEYS: AnnualAmountKey[] = ['prior2Year', 'priorYear', 'currentYear', 'budget'];
const QUARTERLY_KEYS: QuarterlyAmountKey[] = ['priorYear', 'currentQuarter', 'ytd', 'budget'];

export type AmountRecord = Record<string, number>;
export type StatementRecord = Record<string, AmountRecord>;

export interface ParsedTrialBalanceRow {
  glCode: string;
  accountDescription: string;
  noteRef: string;
  mapsTo: string;
  statementRow: string;
  source: string;
  amounts: Record<string, number>;
}

export interface ParsedKpiRow {
  key: string;
  label: string;
  priorYear: string;
  /** Current-year (annual) or current-quarter (quarterly) value */
  current: string;
  ytd: string;
  target: string;
  notes: string;
}

export interface ParsedFinancialPack {
  packType: PackMode;
  amountKeys: string[];
  cover: {
    companyName: string;
    sector: string;
    financialYear: string;
    reportingPeriod: string;
    preparedByName: string;
    authorizedByName: string;
  };
  trialBalance: ParsedTrialBalanceRow[];
  balanceSheet: StatementRecord;
  incomeStatement: StatementRecord;
  cashFlow: StatementRecord;
  changesInEquity: StatementRecord;
  operationalKpis: ParsedKpiRow[];
  governanceKpis: ParsedKpiRow[];
  mappedLines: number;
  sheetsFound: string[];
  warnings: string[];
}

interface LineMapEntry {
  key: string;
  label: string;
  note?: string;
  aliases?: string[];
  /** Expenses/costs are entered as positives in the forms */
  absolute?: boolean;
}

const BALANCE_SHEET_MAP: LineMapEntry[] = [
  { key: 'ppe', label: 'Property, Plant & Equipment', note: '1.1' },
  { key: 'rouAssets', label: 'Right-of-Use Assets (IFRS 16)', note: '1.2' },
  { key: 'intangibles', label: 'Intangible Assets', note: '1.3' },
  { key: 'goodwill', label: 'Goodwill', note: '1.4' },
  { key: 'biologicalAssetsNC', label: 'Biological Assets (IAS 41)', note: '1.5' },
  { key: 'investmentProperty', label: 'Investment Property', note: '1.6' },
  { key: 'longTermInvestments', label: 'Long-term Investments', note: '1.7' },
  { key: 'deferredTaxAssets', label: 'Deferred Tax Assets', note: '1.8' },
  { key: 'inventories', label: 'Inventories', note: '1.9' },
  {
    key: 'biologicalAssetsCurrent',
    label: 'Biological Assets - Current (IAS 41)',
    note: '1.10',
  },
  { key: 'tradeReceivables', label: 'Trade and Other Receivables', note: '1.11' },
  { key: 'contractAssets', label: 'Contract Assets (IFRS 15)', note: '1.12' },
  {
    key: 'relatedPartyReceivables',
    label: 'Related Party Receivables (IAS 24)',
    note: '1.15',
    aliases: ['Related Party Receivables'],
  },
  { key: 'prepayments', label: 'Prepayments', note: '1.13' },
  { key: 'cash', label: 'Cash and Cash Equivalents', note: '1.14' },
  { key: 'shareCapital', label: 'Share Capital', note: '2.1' },
  { key: 'sharePremium', label: 'Share Premium', note: '2.2' },
  { key: 'retainedEarnings', label: 'Retained Earnings', note: '2.3' },
  { key: 'otherReserves', label: 'Other Reserves', note: '2.4' },
  { key: 'unallocatedShareCapital', label: 'Unallocated Share Capital', note: '2.5' },
  { key: 'longTermBorrowings', label: 'Long-term Borrowings', note: '3.1' },
  {
    key: 'leaseLiabilitiesNC',
    label: 'Lease Liabilities - Non-current (IFRS 16)',
    note: '3.2',
  },
  { key: 'deferredTaxLiabilities', label: 'Deferred Tax Liabilities', note: '3.3' },
  { key: 'provisionsNC', label: 'Provisions - Non-current', note: '3.4' },
  { key: 'employeeBenefits', label: 'Employee Benefits Liability (IAS 19)', note: '3.5' },
  { key: 'governmentLoans', label: 'Government Loans (Non-current)', note: '3.6' },
  { key: 'deferredGovGrant', label: 'Deferred Government Grant (IAS 20)', note: '3.7' },
  { key: 'tradePayables', label: 'Trade and Other Payables', note: '3.9' },
  { key: 'contractLiabilities', label: 'Contract Liabilities (IFRS 15)', note: '3.10' },
  {
    key: 'leaseLiabilitiesCurrent',
    label: 'Lease Liabilities - Current (IFRS 16)',
    note: '3.11',
  },
  {
    key: 'relatedPartyPayables',
    label: 'Related Party Payables (IAS 24)',
    note: '3.12',
    aliases: ['Related Party Payables'],
  },
  { key: 'shortTermBorrowings', label: 'Short-term Borrowings', note: '3.13' },
  { key: 'currentTaxLiabilities', label: 'Current Tax Liabilities', note: '3.14' },
  { key: 'provisionsCurrent', label: 'Provisions - Current', note: '3.15' },
  { key: 'deferredIncome', label: 'Deferred Income', note: '3.8' },
];

const INCOME_STATEMENT_MAP: LineMapEntry[] = [
  {
    key: 'contractRevenue',
    label: 'Revenue from Contracts with Customers (IFRS 15)',
    note: '4.1',
  },
  { key: 'serviceRevenue', label: 'Service Revenue', note: '4.2' },
  { key: 'biologicalGains', label: 'Gains on Biological Assets (IAS 41)', note: '4.3' },
  { key: 'rentalIncome', label: 'Rental Income from Investment Property', note: '4.4' },
  { key: 'govGrantIncome', label: 'Government Grant Income (IAS 20)', note: '4.5' },
  { key: 'otherGrants', label: 'Other Grants', note: '4.6' },
  { key: 'otherIncome', label: 'Other Income', note: '4.7' },
  { key: 'cogs', label: 'Cost of Goods Sold', note: '5.1', absolute: true },
  { key: 'costOfServices', label: 'Cost of Services', note: '5.2', absolute: true },
  {
    key: 'bioAssetChanges',
    label: 'Changes in Biological Assets (IAS 41)',
    note: '5.3',
    absolute: true,
  },
  {
    key: 'directCostsInvestmentProperty',
    label: 'Direct Costs - Investment Property',
    note: '5.4',
    absolute: true,
  },
  {
    key: 'employeeBenefitsExpense',
    label: 'Employee Benefits Expense (IAS 19)',
    note: '6.1',
    absolute: true,
  },
  { key: 'depreciationPpe', label: 'Depreciation - PPE (IAS 16)', note: '6.2', absolute: true },
  {
    key: 'depreciationRou',
    label: 'Depreciation - Right-of-Use Assets (IFRS 16)',
    note: '6.3',
    aliases: ['Depreciation - ROU Assets (IFRS 16)'],
    absolute: true,
  },
  {
    key: 'amortisationIntangibles',
    label: 'Amortisation - Intangibles (IAS 38)',
    note: '6.4',
    absolute: true,
  },
  { key: 'impairmentLosses', label: 'Impairment Losses (IAS 36)', note: '6.5', absolute: true },
  {
    key: 'leaseInterest',
    label: 'Lease Interest Expense (IFRS 16)',
    note: '6.6',
    absolute: true,
  },
  {
    key: 'professionalFees',
    label: 'Professional Fees',
    note: '6.7',
    aliases: ['Professional & Legal Fees'],
    absolute: true,
  },
  { key: 'marketing', label: 'Marketing & Advertising', note: '6.8', absolute: true },
  { key: 'adminExpenses', label: 'Administrative Expenses', note: '6.9', absolute: true },
  {
    key: 'eclCharge',
    label: 'Expected Credit Losses (IFRS 9)',
    note: '6.10',
    absolute: true,
  },
  {
    key: 'otherOperatingExpenses',
    label: 'Other Operating Expenses',
    note: '6.11',
    absolute: true,
  },
  { key: 'financeIncome', label: 'Finance Income', note: '7.1' },
  { key: 'financeCosts', label: 'Finance Costs', note: '7.2', absolute: true },
  { key: 'fxGainLoss', label: 'Net Foreign Exchange Gain/(Loss)', note: '7.3' },
  { key: 'shareOfAssociates', label: 'Share of Profit from Associates (IAS 28)', note: '7.4' },
  { key: 'incomeTaxExpense', label: 'Income Tax Expense (IAS 12)', note: '8.1', absolute: true },
  { key: 'revaluationSurplus', label: 'Revaluation Surplus - PPE (IAS 16)' },
  {
    key: 'dbPlanRemeasurement',
    label: 'Remeasurement of Defined Benefit Plans (IAS 19)',
  },
  { key: 'fvEquityChanges', label: 'Fair Value Changes - Equity Instruments (IFRS 9)' },
  { key: 'fxTranslation', label: 'Foreign Currency Translation Differences' },
  { key: 'cashFlowHedges', label: 'Cash Flow Hedges (IFRS 9)' },
];

const CASH_FLOW_MAP: LineMapEntry[] = [
  { key: 'profitBeforeTax', label: 'Profit before tax' },
  { key: 'addDepreciationPpe', label: 'Depreciation of PPE (IAS 16)' },
  { key: 'addDepreciationRou', label: 'Depreciation of Right-of-Use Assets (IFRS 16)' },
  { key: 'addAmortisation', label: 'Amortisation of Intangibles (IAS 38)' },
  { key: 'addImpairment', label: 'Impairment Losses (IAS 36)' },
  { key: 'addNetFinanceCosts', label: 'Net Finance Costs' },
  { key: 'lessShareAssociates', label: 'Share of Profit from Associates' },
  { key: 'lessBioGains', label: 'Gain on Biological Assets' },
  { key: 'changeReceivables', label: '(Increase)/Decrease in Trade Receivables' },
  { key: 'changeInventories', label: '(Increase)/Decrease in Inventories' },
  { key: 'changeBiologicalAssets', label: '(Increase)/Decrease in Biological Assets' },
  { key: 'changePayables', label: 'Increase/(Decrease) in Trade Payables' },
  { key: 'changeContractLiabilities', label: 'Increase/(Decrease) in Contract Liabilities' },
  { key: 'taxesPaid', label: 'Income Taxes Paid' },
  { key: 'purchasePpe', label: 'Purchase of Property, Plant & Equipment' },
  { key: 'proceedsSalePpe', label: 'Proceeds from Sale of PPE' },
  { key: 'purchaseIntangibles', label: 'Purchase of Intangible Assets' },
  { key: 'acquireBiologicalAssets', label: 'Acquisition of Biological Assets' },
  { key: 'proceedsSaleBio', label: 'Proceeds from Sale of Biological Assets' },
  { key: 'purchaseInvestmentProperty', label: 'Purchase of Investment Property' },
  { key: 'dividendsFromAssociates', label: 'Dividends Received from Associates' },
  { key: 'proceedsShareCapital', label: 'Proceeds from Issuance of Share Capital' },
  { key: 'proceedsLongTermBorrowings', label: 'Proceeds from Long-term Borrowings' },
  { key: 'repayLongTermBorrowings', label: 'Repayment of Long-term Borrowings' },
  {
    key: 'leasePrincipalPaid',
    label: 'Payment of Lease Liabilities - Principal (IFRS 16)',
  },
  {
    key: 'leaseInterestPaid',
    label: 'Payment of Lease Liabilities - Interest (IFRS 16)',
  },
  { key: 'interestPaidBorrowings', label: 'Interest Paid on Borrowings' },
  { key: 'dividendsPaid', label: 'Dividends Paid' },
  {
    key: 'cashOpening',
    label: 'Cash and Cash Equivalents at Beginning of Period',
    aliases: [
      'Cash and Cash Equivalents at Beginning of Year',
      'Cash and Cash Equivalents at Start of Year',
      'Opening Cash and Cash Equivalents',
    ],
  },
];

const EQUITY_MAP: LineMapEntry[] = [
  {
    key: 'openingEquity',
    label: 'Balance at start of period',
    aliases: ['Balance at 1 January', 'Opening balance', 'Balance at start of year'],
  },
  { key: 'profitForPeriod', label: 'Profit for the period', aliases: ['Profit for the year'] },
  {
    key: 'otherComprehensiveIncome',
    label: 'Total other comprehensive income',
    aliases: ['Other comprehensive income'],
  },
  { key: 'dividends', label: 'Dividends paid', aliases: ['Dividends declared'], absolute: true },
  {
    key: 'shareCapitalIssued',
    label: 'Issue of share capital',
    aliases: ['Issue of shares', 'Proceeds from issuance of share capital'],
  },
];

const OPERATIONAL_KPI_LABELS: Record<string, string> = {
  'OP-1': 'Production Capacity Utilisation (%)',
  'OP-2': 'Units Produced (volume)',
  'OP-3': 'On-Time Delivery Rate (%)',
  'OP-4': 'Customer Satisfaction Score (%)',
  'OP-5': 'Customer Retention Rate (%)',
  'OP-6': 'Other operational KPI (specify)',
  'OP-7': 'Other operational KPI (specify)',
  'OP-8': 'Other operational KPI (specify)',
  'OP-9': 'Other operational KPI (specify)',
  'OP-10': 'Other operational KPI (specify)',
};

const GOVERNANCE_KPI_LABELS: Record<string, string> = {
  'GV-1': 'Board Meetings Held (per year / YTD)',
  'GV-2': 'Board Attendance Rate (%)',
  'GV-3': 'Regulatory Compliance Rate (%)',
  'GV-4': 'Audit Findings Resolved (%)',
  'GV-5': 'Internal Audit Plan Completion (%)',
  'GV-6': 'Other governance KPI (specify)',
  'GV-7': 'Other governance KPI (specify)',
  'GV-8': 'Other governance KPI (specify)',
  'GV-9': 'Other governance KPI (specify)',
  'GV-10': 'Other governance KPI (specify)',
};

type Row = unknown[];

function text(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/** lowercase alphanumeric words — tolerant of punctuation and spacing differences */
function normalize(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** normalize with parenthetical standard references dropped: "Goodwill (IAS 36)" -> "goodwill" */
function looseNormalize(value: unknown): string {
  return normalize(text(value).replace(/\([^)]*\)/g, ' '));
}

function isFormulaOnly(value: unknown): boolean {
  return typeof value === 'string' && value.trim().startsWith('=');
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw.startsWith('=')) return null;
  const negative = /^\(.*\)$/.test(raw);
  const cleaned = raw
    .replace(/[()]/g, '')
    .replace(/,/g, '')
    .replace(/rwf/gi, '')
    .replace(/%/g, '')
    .trim();
  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

const rowCache = new WeakMap<XLSX.WorkBook, Map<string, Row[]>>();

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): Row[] {
  let cache = rowCache.get(workbook);
  if (!cache) {
    cache = new Map<string, Row[]>();
    rowCache.set(workbook, cache);
  }
  const cached = cache.get(sheetName);
  if (cached) return cached;

  const sheet = workbook.Sheets[sheetName];
  const rows = sheet
    ? XLSX.utils.sheet_to_json<Row>(sheet, {
        header: 1,
        blankrows: false,
        raw: true,
        defval: null,
        range: clampRange(sheet),
      })
    : [];
  cache.set(sheetName, rows);
  return rows;
}

const MAX_COLUMNS = 60;
const MAX_ROWS = 3000;

/**
 * Templates often carry an inflated used-range (the annual Cover sheet reports
 * 16k columns), which makes a full sheet walk unusably slow. Reporting data
 * lives in the first columns, so cap the range before converting.
 */
function clampRange(sheet: XLSX.WorkSheet): string | undefined {
  const ref = sheet['!ref'];
  if (!ref) return undefined;
  try {
    const range = XLSX.utils.decode_range(ref);
    range.e.c = Math.min(range.e.c, range.s.c + MAX_COLUMNS);
    range.e.r = Math.min(range.e.r, range.s.r + MAX_ROWS);
    return XLSX.utils.encode_range(range);
  } catch {
    return undefined;
  }
}

function findSheet(
  workbook: XLSX.WorkBook,
  include: RegExp,
  exclude?: RegExp,
): string | undefined {
  return workbook.SheetNames.find((name) => {
    const normalized = normalize(name);
    if (exclude?.test(normalized)) return false;
    return include.test(normalized);
  });
}

interface LineLookup {
  byLabel: Map<string, LineMapEntry>;
  byLoose: Map<string, LineMapEntry>;
  byNote: Map<string, LineMapEntry>;
}

function buildLookup(entries: LineMapEntry[]): LineLookup {
  const byLabel = new Map<string, LineMapEntry>();
  const byLoose = new Map<string, LineMapEntry>();
  const looseCollisions = new Set<string>();
  const byNote = new Map<string, LineMapEntry>();
  const noteCollisions = new Set<string>();

  for (const entry of entries) {
    for (const label of [entry.label, ...(entry.aliases ?? [])]) {
      const exact = normalize(label);
      if (exact && !byLabel.has(exact)) byLabel.set(exact, entry);
      const loose = looseNormalize(label);
      if (!loose) continue;
      const existing = byLoose.get(loose);
      if (existing && existing.key !== entry.key) {
        looseCollisions.add(loose);
      } else {
        byLoose.set(loose, entry);
      }
    }
    if (entry.note) {
      const existing = byNote.get(entry.note);
      if (existing && existing.key !== entry.key) {
        noteCollisions.add(entry.note);
      } else {
        byNote.set(entry.note, entry);
      }
    }
  }

  for (const key of looseCollisions) byLoose.delete(key);
  for (const key of noteCollisions) byNote.delete(key);

  return { byLabel, byLoose, byNote };
}

function noteText(value: unknown): string {
  if (typeof value === 'number') {
    // Excel stores note refs such as 1.10 as the number 1.1
    return String(value);
  }
  return text(value).replace(/^note\s*/i, '');
}

function matchLine(
  lookup: LineLookup,
  description: unknown,
  note: unknown,
): LineMapEntry | undefined {
  const exact = normalize(description);
  if (exact && lookup.byLabel.has(exact)) return lookup.byLabel.get(exact);
  const loose = looseNormalize(description);
  if (loose && lookup.byLoose.has(loose)) return lookup.byLoose.get(loose);
  const ref = noteText(note);
  if (ref && lookup.byNote.has(ref)) return lookup.byNote.get(ref);
  return undefined;
}

interface ColumnPlan {
  amounts: Array<{ key: AmountKey; index: number }>;
  descriptionIndex: number;
  noteIndex: number;
  headerRowIndex: number;
}

function detectAmountColumns(
  header: Row,
  mode: PackMode,
): Array<{ key: AmountKey; index: number }> {
  const found: Array<{ key: AmountKey; index: number }> = [];
  const used = new Set<AmountKey>();

  const push = (key: AmountKey, index: number) => {
    if (used.has(key)) return;
    used.add(key);
    found.push({ key, index });
  };

  const budgetIndex = header.findIndex((cell) => {
    const value = normalize(cell);
    return /budget|forecast|target/.test(value) && !/dr|cr|debit|credit/.test(value);
  });

  if (mode === 'annual') {
    const years: Array<{ year: number; index: number }> = [];
    header.forEach((cell, index) => {
      if (index === budgetIndex) return;
      const value = normalize(cell);
      const match = /(\d{4})\s*(actual|act)?/.exec(value);
      if (match && /actual|act/.test(value)) {
        years.push({ year: Number(match[1]), index });
      }
    });
    years.sort((a, b) => a.year - b.year);
    const tail = years.slice(-3);
    const keys: AnnualAmountKey[] =
      tail.length >= 3
        ? ['prior2Year', 'priorYear', 'currentYear']
        : tail.length === 2
          ? ['priorYear', 'currentYear']
          : ['currentYear'];
    tail.forEach((entry, i) => push(keys[i], entry.index));
  } else {
    header.forEach((cell, index) => {
      if (index === budgetIndex) return;
      const value = normalize(cell);
      if (!value) return;
      if (/prior\s*year|previous\s*year|same\s*q/.test(value)) push('priorYear', index);
      else if (/current\s*quarter|current\s*q\b|^q[1-4]/.test(value)) push('currentQuarter', index);
      else if (/ytd|year to date|cumulative/.test(value)) push('ytd', index);
    });
  }

  if (budgetIndex >= 0) push('budget', budgetIndex);
  return found;
}

function planColumns(rows: Row[], mode: PackMode): ColumnPlan | null {
  for (let i = 0; i < Math.min(rows.length, 12); i += 1) {
    const row = rows[i] ?? [];
    const descriptionIndex = row.findIndex((cell) =>
      /^(account description|description|line item|particulars)$/.test(normalize(cell)),
    );
    if (descriptionIndex < 0) continue;
    const amounts = detectAmountColumns(row, mode);
    if (!amounts.length) continue;
    const noteIndex = row.findIndex((cell) => /^(note|note ref|ref)$/.test(normalize(cell)));
    return { amounts, descriptionIndex, noteIndex, headerRowIndex: i };
  }
  return null;
}

function parseStatement(
  rows: Row[],
  entries: LineMapEntry[],
  mode: PackMode,
  sheetLabel: string,
  warnings: string[],
): { statement: StatementRecord; mapped: number } {
  const statement: StatementRecord = {};
  const plan = planColumns(rows, mode);
  if (!plan) {
    warnings.push(`${sheetLabel}: could not locate the amount columns — sheet skipped.`);
    return { statement, mapped: 0 };
  }

  const lookup = buildLookup(entries);
  let mapped = 0;
  let formulaOnly = 0;

  for (let i = plan.headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const description = row[plan.descriptionIndex];
    if (!text(description)) continue;
    const normalizedDescription = normalize(description);
    if (/^(total|sub total|subtotal|balance check|legend)/.test(normalizedDescription)) continue;

    const note = plan.noteIndex >= 0 ? row[plan.noteIndex] : null;
    const entry = matchLine(lookup, description, note);
    if (!entry || statement[entry.key]) continue;

    const amounts: AmountRecord = {};
    let hasValue = false;
    for (const column of plan.amounts) {
      const cell = row[column.index];
      if (isFormulaOnly(cell)) formulaOnly += 1;
      const value = toNumber(cell);
      if (value == null) continue;
      amounts[column.key] = entry.absolute ? Math.abs(value) : value;
      hasValue = true;
    }
    if (!hasValue) continue;
    statement[entry.key] = amounts;
    mapped += 1;
  }

  if (formulaOnly > 0) {
    warnings.push(
      `${sheetLabel}: ${formulaOnly} cell(s) held unevaluated formulas — open and re-save the workbook in Excel, or enter those lines manually.`,
    );
  }
  if (mapped === 0) {
    warnings.push(`${sheetLabel}: no statement lines matched the template line descriptions.`);
  }

  return { statement, mapped };
}

/**
 * The annual workbook presents Changes in Equity as one block per financial
 * year with a "Total Equity" column, instead of comparative amount columns.
 */
function parseAnnualEquityBlocks(
  rows: Row[],
  warnings: string[],
): { statement: StatementRecord; mapped: number } {
  const blocks: Array<{ year: number; start: number; end: number }> = [];
  rows.forEach((row, index) => {
    const value = normalize(row?.[0]);
    const match = /year ended.*?(\d{4})/.exec(value);
    if (match) blocks.push({ year: Number(match[1]), start: index, end: rows.length });
  });
  if (!blocks.length) return { statement: {}, mapped: 0 };
  blocks.forEach((block, index) => {
    if (index + 1 < blocks.length) block.end = blocks[index + 1].start;
  });
  blocks.sort((a, b) => a.year - b.year);

  const tail = blocks.slice(-3);
  const keys: AnnualAmountKey[] =
    tail.length >= 3
      ? ['prior2Year', 'priorYear', 'currentYear']
      : tail.length === 2
        ? ['priorYear', 'currentYear']
        : ['currentYear'];

  const statement: StatementRecord = {};
  const setAmount = (lineKey: string, amountKey: AmountKey, value: number) => {
    statement[lineKey] = { ...(statement[lineKey] ?? {}), [amountKey]: value };
  };

  let mapped = 0;
  tail.forEach((block, blockIndex) => {
    const amountKey = keys[blockIndex];
    let totalColumn = -1;
    for (let i = block.start; i < block.end; i += 1) {
      const row = rows[i] ?? [];
      const index = row.findIndex((cell) => /^total equity$/.test(normalize(cell)));
      if (index >= 0) {
        totalColumn = index;
        break;
      }
    }
    if (totalColumn < 0) {
      totalColumn = Math.max(0, (rows[block.start + 1]?.length ?? 1) - 1);
    }

    let profit: number | null = null;
    let comprehensive: number | null = null;

    for (let i = block.start; i < block.end; i += 1) {
      const row = rows[i] ?? [];
      const label = normalize(row[0]);
      if (!label) continue;
      const value = toNumber(row[totalColumn]);
      if (value == null) continue;

      if (/^balance at 1 january|^balance at start/.test(label)) {
        setAmount('openingEquity', amountKey, value);
        mapped += 1;
      } else if (/^profit for the (year|period)/.test(label)) {
        profit = value;
        setAmount('profitForPeriod', amountKey, value);
        mapped += 1;
      } else if (/^total comprehensive income/.test(label)) {
        comprehensive = value;
      } else if (/^issue of share capital|^proceeds from issuance of share capital/.test(label)) {
        setAmount('shareCapitalIssued', amountKey, value);
        mapped += 1;
      } else if (/^dividends (declared|paid)/.test(label)) {
        setAmount('dividends', amountKey, Math.abs(value));
        mapped += 1;
      }
    }

    if (comprehensive != null) {
      setAmount('otherComprehensiveIncome', amountKey, comprehensive - (profit ?? 0));
      mapped += 1;
    }
  });

  if (!mapped) {
    warnings.push('Changes in Equity: no year blocks could be interpreted.');
  }
  return { statement, mapped };
}

interface TrialBalanceColumn {
  field: string;
  index: number;
}

function planTrialBalance(
  rows: Row[],
  mode: PackMode,
): {
  headerRowIndex: number;
  glIndex: number;
  descriptionIndex: number;
  noteIndex: number;
  mapsToIndex: number;
  statementRowIndex: number;
  sourceIndex: number;
  amounts: TrialBalanceColumn[];
} | null {
  for (let i = 0; i < Math.min(rows.length, 12); i += 1) {
    const row = rows[i] ?? [];
    const glIndex = row.findIndex((cell) => /^(gl code|account code|code)$/.test(normalize(cell)));
    const descriptionIndex = row.findIndex((cell) =>
      /^(account description|description)$/.test(normalize(cell)),
    );
    if (glIndex < 0 || descriptionIndex < 0) continue;

    const amounts: TrialBalanceColumn[] = [];
    if (mode === 'annual') {
      const yearColumns: Array<{ year: number; side: 'Debit' | 'Credit'; index: number }> = [];
      row.forEach((cell, index) => {
        const value = normalize(cell);
        const yearMatch = /(\d{4})/.exec(value);
        const side = /debit|\bdr\b/.test(value) ? 'Debit' : /credit|\bcr\b/.test(value) ? 'Credit' : null;
        if (!side) return;
        if (/budget/.test(value)) {
          amounts.push({ field: side === 'Debit' ? 'budgetDebit' : 'budgetCredit', index });
          return;
        }
        if (yearMatch) yearColumns.push({ year: Number(yearMatch[1]), side, index });
      });
      const years = [...new Set(yearColumns.map((c) => c.year))].sort((a, b) => a - b).slice(-3);
      const prefixes =
        years.length >= 3
          ? ['prior2Year', 'priorYear', 'currentYear']
          : years.length === 2
            ? ['priorYear', 'currentYear']
            : ['currentYear'];
      years.forEach((year, position) => {
        for (const column of yearColumns.filter((c) => c.year === year)) {
          amounts.push({ field: `${prefixes[position]}${column.side}`, index: column.index });
        }
      });
    } else {
      row.forEach((cell, index) => {
        const value = normalize(cell);
        const side = /debit|\bdr\b/.test(value) ? 'Debit' : /credit|\bcr\b/.test(value) ? 'Credit' : null;
        if (!side) return;
        if (/budget|target/.test(value)) amounts.push({ field: `budget${side}`, index });
        else if (/prior\s*year|previous\s*year/.test(value)) {
          amounts.push({ field: `priorYear${side}`, index });
        } else if (/current\s*quarter|current\s*q\b/.test(value)) {
          amounts.push({ field: `currentQuarter${side}`, index });
        } else if (/ytd/.test(value)) amounts.push({ field: `ytd${side}`, index });
      });
    }

    if (!amounts.length) continue;

    return {
      headerRowIndex: i,
      glIndex,
      descriptionIndex,
      noteIndex: row.findIndex((cell) => /^(note ref|note|ref)$/.test(normalize(cell))),
      mapsToIndex: row.findIndex((cell) => /^maps to$/.test(normalize(cell))),
      statementRowIndex: row.findIndex((cell) => /^statement row$/.test(normalize(cell))),
      sourceIndex: row.findIndex((cell) => /^(source|source input|source \/ input)$/.test(normalize(cell))),
      amounts,
    };
  }
  return null;
}

const MAX_TRIAL_BALANCE_ROWS = 400;

function parseTrialBalance(
  rows: Row[],
  mode: PackMode,
  warnings: string[],
): ParsedTrialBalanceRow[] {
  const plan = planTrialBalance(rows, mode);
  if (!plan) {
    warnings.push('Trial Balance: header row not recognised — sheet skipped.');
    return [];
  }

  const parsed: ParsedTrialBalanceRow[] = [];
  for (let i = plan.headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const glCode = text(row[plan.glIndex]);
    const description = text(row[plan.descriptionIndex]);
    if (!glCode || !description) continue;
    // Sub-totals are recomputed from detail accounts, so skip them on import.
    if (/^total\b/.test(normalize(description))) continue;

    const amounts: Record<string, number> = {};
    let hasValue = false;
    for (const column of plan.amounts) {
      const value = toNumber(row[column.index]);
      if (value == null) continue;
      amounts[column.field] = value;
      hasValue = true;
    }
    if (!hasValue) continue;

    parsed.push({
      glCode,
      accountDescription: description.replace(/\s+/g, ' ').trim(),
      noteRef: noteText(plan.noteIndex >= 0 ? row[plan.noteIndex] : ''),
      mapsTo: plan.mapsToIndex >= 0 ? text(row[plan.mapsToIndex]) : '',
      statementRow: plan.statementRowIndex >= 0 ? text(row[plan.statementRowIndex]) : '',
      source: plan.sourceIndex >= 0 ? text(row[plan.sourceIndex]) : '',
      amounts,
    });

    if (parsed.length >= MAX_TRIAL_BALANCE_ROWS) {
      warnings.push(
        `Trial Balance: only the first ${MAX_TRIAL_BALANCE_ROWS} account rows were imported.`,
      );
      break;
    }
  }
  return parsed;
}

function parseCover(
  rows: Row[],
): ParsedFinancialPack['cover'] {
  const cover: ParsedFinancialPack['cover'] = {
    companyName: '',
    sector: '',
    financialYear: '',
    reportingPeriod: '',
    preparedByName: '',
    authorizedByName: '',
  };

  const placeholder = (value: string) =>
    !value || /^[.…\s_-]+$/.test(value) || /^fill in/i.test(value);

  // Labels sit immediately left of their value; looking further right would
  // pick up unrelated columns (the annual cover has a navigation list there).
  const valueAfter = (row: Row, index: number): string => {
    for (let i = index + 1; i < Math.min(row.length, index + 3); i += 1) {
      const value = text(row[i]);
      if (!value) continue;
      return placeholder(value) ? '' : value;
    }
    return '';
  };

  for (const row of rows) {
    if (!row) continue;
    row.forEach((cell, index) => {
      const label = normalize(cell);
      if (!label) return;
      if (!cover.companyName && /^company name/.test(label)) {
        cover.companyName = valueAfter(row, index);
      } else if (!cover.sector && /^sector/.test(label)) {
        cover.sector = valueAfter(row, index);
      } else if (!cover.financialYear && /^financial year|^year ended|^fiscal year/.test(label)) {
        cover.financialYear = valueAfter(row, index).replace(/\.0$/, '');
      } else if (!cover.reportingPeriod && /^reporting period|^period|^quarter/.test(label)) {
        cover.reportingPeriod = valueAfter(row, index);
      }
    });
  }

  if (!cover.financialYear) {
    for (const row of rows) {
      for (const cell of row ?? []) {
        const match = /(20\d{2})/.exec(text(cell));
        if (match) {
          cover.financialYear = match[1];
          return cover;
        }
      }
    }
  }

  return cover;
}

function parseKpiValue(label: string, cell: unknown): string {
  const value = toNumber(cell);
  if (value == null) return text(cell);
  // Percentage KPIs are stored as Excel fractions (0.82 => 82%)
  if (/%/.test(label) && value !== 0 && Math.abs(value) <= 1) {
    return String(Math.round(value * 10000) / 100);
  }
  return String(Math.round(value * 100) / 100);
}

function parseKpis(
  rows: Row[],
  mode: PackMode,
  warnings: string[],
): { operationalKpis: ParsedKpiRow[]; governanceKpis: ParsedKpiRow[] } {
  const operationalKpis: ParsedKpiRow[] = [];
  const governanceKpis: ParsedKpiRow[] = [];

  let columns = { description: 1, prior: 2, current: 3, ytd: -1, target: 4, notes: 8 };
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (!row.some((cell) => /^ref$/.test(normalize(cell)))) continue;
    const description = row.findIndex((cell) => /description|kpi/.test(normalize(cell)));
    const prior = row.findIndex((cell) => /prior year|prior/.test(normalize(cell)));
    const current = row.findIndex((cell) =>
      mode === 'annual'
        ? /current year|current/.test(normalize(cell))
        : /current quarter|current q/.test(normalize(cell)),
    );
    const ytd = row.findIndex((cell) => /ytd/.test(normalize(cell)));
    const target = row.findIndex((cell) => /benchmark|target/.test(normalize(cell)));
    const notes = row.findIndex((cell) => /notes|comments/.test(normalize(cell)));
    columns = {
      description: description >= 0 ? description : 1,
      prior: prior >= 0 ? prior : 2,
      current: current >= 0 ? current : 3,
      ytd,
      target: target >= 0 ? target : 4,
      notes: notes >= 0 ? notes : 8,
    };
    break;
  }

  for (const row of rows) {
    const ref = text(row?.[0]).toUpperCase().replace(/\s+/g, '');
    const match = /^(OP|GV)-(\d{1,2})$/.exec(ref);
    if (!match) continue;

    const sheetLabel = text(row[columns.description]);
    const defaultLabel =
      match[1] === 'OP' ? OPERATIONAL_KPI_LABELS[ref] : GOVERNANCE_KPI_LABELS[ref];
    const label = sheetLabel || defaultLabel || ref;
    const parsedRow: ParsedKpiRow = {
      key: ref,
      label,
      priorYear: parseKpiValue(label, row[columns.prior]),
      current: parseKpiValue(label, row[columns.current]),
      ytd: columns.ytd >= 0 ? parseKpiValue(label, row[columns.ytd]) : '',
      target: parseKpiValue(label, row[columns.target]),
      notes: text(row[columns.notes]),
    };
    if (match[1] === 'OP') operationalKpis.push(parsedRow);
    else governanceKpis.push(parsedRow);
  }

  if (!operationalKpis.length && !governanceKpis.length) {
    warnings.push('Other KPIs Dashboard: no OP-/GV- rows were found.');
  }

  return { operationalKpis, governanceKpis };
}

function detectMode(workbook: XLSX.WorkBook): PackMode | null {
  for (const name of workbook.SheetNames) {
    const rows = sheetRows(workbook, name).slice(0, 12);
    for (const row of rows) {
      const joined = (row ?? []).map((cell) => normalize(cell)).join(' | ');
      if (/\d{4}\s*actual/.test(joined)) return 'annual';
      if (/ytd|current quarter/.test(joined)) return 'quarterly';
    }
  }
  return null;
}

export function parseFinancialPack(buffer: Buffer, requestedMode?: PackMode): ParsedFinancialPack {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  if (!workbook.SheetNames.length) {
    throw new Error('Workbook has no sheets');
  }

  const warnings: string[] = [];
  const detected = detectMode(workbook);
  if (requestedMode && detected && requestedMode !== detected) {
    throw new Error(
      `This looks like the ${detected} statements workbook, so its amount columns cannot fill the ${requestedMode} form. Open the ${detected} report form to import it.`,
    );
  }
  const mode: PackMode = requestedMode ?? detected ?? 'annual';

  const coverSheet = findSheet(workbook, /cover|front|title/);
  const trialSheet = findSheet(workbook, /trial balance/);
  const balanceSheetName = findSheet(workbook, /balance sheet|financial position/, /note/);
  const incomeSheetName = findSheet(workbook, /income statement|profit or loss|profit and loss/, /note/);
  const cashFlowSheetName = findSheet(workbook, /cash flow/, /note/);
  const equitySheetName = findSheet(workbook, /changes in equity|equity/, /note/);
  const kpiSheetName = findSheet(workbook, /kpi/);

  const cover = coverSheet
    ? parseCover(sheetRows(workbook, coverSheet))
    : {
        companyName: '',
        sector: '',
        financialYear: '',
        reportingPeriod: '',
        preparedByName: '',
        authorizedByName: '',
      };

  let mappedLines = 0;
  const runStatement = (sheetName: string | undefined, entries: LineMapEntry[], label: string) => {
    if (!sheetName) {
      warnings.push(`${label}: sheet not found in the workbook.`);
      return {};
    }
    const result = parseStatement(sheetRows(workbook, sheetName), entries, mode, label, warnings);
    mappedLines += result.mapped;
    return result.statement;
  };

  const balanceSheet = runStatement(balanceSheetName, BALANCE_SHEET_MAP, 'Balance Sheet');
  const incomeStatement = runStatement(incomeSheetName, INCOME_STATEMENT_MAP, 'Income Statement');
  const cashFlow = runStatement(cashFlowSheetName, CASH_FLOW_MAP, 'Cash Flow Statement');

  let changesInEquity: StatementRecord = {};
  if (equitySheetName) {
    const equityRows = sheetRows(workbook, equitySheetName);
    const plan = planColumns(equityRows, mode);
    if (plan) {
      const result = parseStatement(
        equityRows,
        EQUITY_MAP,
        mode,
        'Changes in Equity',
        warnings,
      );
      changesInEquity = result.statement;
      mappedLines += result.mapped;
    } else if (mode === 'annual') {
      const result = parseAnnualEquityBlocks(equityRows, warnings);
      changesInEquity = result.statement;
      mappedLines += result.mapped;
    } else {
      warnings.push('Changes in Equity: could not locate the amount columns — sheet skipped.');
    }
  } else {
    warnings.push('Changes in Equity: sheet not found in the workbook.');
  }

  const trialBalance = trialSheet
    ? parseTrialBalance(sheetRows(workbook, trialSheet), mode, warnings)
    : [];
  if (!trialSheet) warnings.push('Trial Balance: sheet not found in the workbook.');

  const kpis = kpiSheetName
    ? parseKpis(sheetRows(workbook, kpiSheetName), mode, warnings)
    : { operationalKpis: [], governanceKpis: [] };
  if (!kpiSheetName) warnings.push('Other KPIs Dashboard: sheet not found in the workbook.');

  warnings.push(
    'Disclosure notes and management commentary are not auto-filled — complete the note sections in the form.',
  );

  if (mappedLines === 0 && !trialBalance.length) {
    throw new Error(
      'No statement lines could be read. Use the official template and keep the "Account Description" and amount column headings unchanged.',
    );
  }

  return {
    packType: mode,
    amountKeys: mode === 'annual' ? [...ANNUAL_KEYS] : [...QUARTERLY_KEYS],
    cover,
    trialBalance,
    balanceSheet,
    incomeStatement,
    cashFlow,
    changesInEquity,
    operationalKpis: kpis.operationalKpis,
    governanceKpis: kpis.governanceKpis,
    mappedLines,
    sheetsFound: workbook.SheetNames,
    warnings,
  };
}
