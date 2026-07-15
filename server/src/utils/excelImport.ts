import * as XLSX from 'xlsx';

/**
 * Maps a simple Excel/CSV financial template into NIPMS statement fields.
 * Expected columns (case-insensitive): Field | Value
 * or a single row with headers matching statement keys.
 */
const FIELD_ALIASES: Record<string, string> = {
  revenue: 'revenue',
  turnover: 'revenue',
  sales: 'revenue',
  cost_of_sales: 'costOfSales',
  'cost of sales': 'costOfSales',
  cogs: 'costOfSales',
  operating_expenses: 'operatingExpenses',
  'operating expenses': 'operatingExpenses',
  opex: 'operatingExpenses',
  interest_expense: 'interestExpense',
  'interest expense': 'interestExpense',
  tax_expense: 'taxExpense',
  'tax expense': 'taxExpense',
  current_assets: 'currentAssets',
  'current assets': 'currentAssets',
  non_current_assets: 'nonCurrentAssets',
  'non-current assets': 'nonCurrentAssets',
  'non current assets': 'nonCurrentAssets',
  current_liabilities: 'currentLiabilities',
  'current liabilities': 'currentLiabilities',
  non_current_liabilities: 'nonCurrentLiabilities',
  'non-current liabilities': 'nonCurrentLiabilities',
  'non current liabilities': 'nonCurrentLiabilities',
  equity: 'equity',
  operating_cash_flow: 'operatingCashFlow',
  'operating cash flow': 'operatingCashFlow',
  investing_cash_flow: 'investingCashFlow',
  'investing cash flow': 'investingCashFlow',
  financing_cash_flow: 'financingCashFlow',
  'financing cash flow': 'financingCashFlow',
};

export const STATEMENT_KEYS = [
  'revenue',
  'costOfSales',
  'operatingExpenses',
  'interestExpense',
  'taxExpense',
  'currentAssets',
  'nonCurrentAssets',
  'currentLiabilities',
  'nonCurrentLiabilities',
  'equity',
  'operatingCashFlow',
  'investingCashFlow',
  'financingCashFlow',
] as const;

export type StatementKey = (typeof STATEMENT_KEYS)[number];

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .replace(/RWF/gi, '')
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function mapField(header: string): StatementKey | null {
  const direct = FIELD_ALIASES[header] || FIELD_ALIASES[header.replace(/\s+/g, '_')];
  if (direct && STATEMENT_KEYS.includes(direct as StatementKey)) {
    return direct as StatementKey;
  }
  const camel = header.replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase());
  if (STATEMENT_KEYS.includes(camel as StatementKey)) return camel as StatementKey;
  return null;
}

export function parseFinancialWorkbook(buffer: Buffer): {
  financialStatements: Record<StatementKey, number>;
  mappedFields: string[];
  unmappedHeaders: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Workbook has no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const financialStatements = Object.fromEntries(
    STATEMENT_KEYS.map((k) => [k, 0]),
  ) as Record<StatementKey, number>;
  const mappedFields: string[] = [];
  const unmappedHeaders: string[] = [];

  if (rows.length === 0) {
    throw new Error('Spreadsheet is empty');
  }

  // Style A: Field / Value columns
  const first = rows[0];
  const keys = Object.keys(first).map(normalizeHeader);
  const hasFieldValue =
    keys.includes('field') && (keys.includes('value') || keys.includes('amount'));

  if (hasFieldValue) {
    for (const row of rows) {
      const entries = Object.entries(row);
      let field = '';
      let value: unknown = 0;
      for (const [k, v] of entries) {
        const nk = normalizeHeader(k);
        if (nk === 'field' || nk === 'item' || nk === 'line') field = normalizeHeader(v);
        if (nk === 'value' || nk === 'amount') value = v;
      }
      const mapped = mapField(field);
      if (mapped) {
        financialStatements[mapped] = toNumber(value);
        mappedFields.push(mapped);
      } else if (field) {
        unmappedHeaders.push(field);
      }
    }
  } else {
    // Style B: one wide row with headers as statement names
    for (const row of rows) {
      for (const [header, value] of Object.entries(row)) {
        const mapped = mapField(normalizeHeader(header));
        if (mapped) {
          financialStatements[mapped] = toNumber(value);
          if (!mappedFields.includes(mapped)) mappedFields.push(mapped);
        } else if (normalizeHeader(header)) {
          unmappedHeaders.push(normalizeHeader(header));
        }
      }
      // Prefer first data row for wide format
      break;
    }
  }

  if (mappedFields.length === 0) {
    throw new Error(
      'No recognised financial fields. Use Field/Value columns or headers such as Revenue, Cost of Sales, Equity.',
    );
  }

  return {
    financialStatements,
    mappedFields,
    unmappedHeaders: [...new Set(unmappedHeaders)],
  };
}

/** Minimal template as CSV string for download */
export function financialTemplateCsv(): string {
  const lines = [
    'Field,Value',
    'Revenue,0',
    'Cost of Sales,0',
    'Operating Expenses,0',
    'Interest Expense,0',
    'Tax Expense,0',
    'Current Assets,0',
    'Non-Current Assets,0',
    'Current Liabilities,0',
    'Non-Current Liabilities,0',
    'Equity,0',
    'Operating Cash Flow,0',
    'Investing Cash Flow,0',
    'Financing Cash Flow,0',
  ];
  return lines.join('\n');
}
