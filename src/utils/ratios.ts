/**
 * Client-side copy of financial ratio formulas (kept in sync with server/src/utils/ratios.ts).
 */
export interface FinancialStatements {
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
}

export interface FinancialRatios {
  grossProfit: number;
  ebitda: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  grossMarginPct: number | null;
  ebitdaMarginPct: number | null;
  netMarginPct: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  returnOnEquityPct: number | null;
  returnOnAssetsPct: number | null;
  redFlags: string[];
}

function safeDiv(a: number, b: number): number | null {
  if (!b || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a / b;
}

function pct(ratio: number | null): number | null {
  if (ratio === null) return null;
  return Math.round(ratio * 1000) / 10;
}

export const EMPTY_STATEMENTS: FinancialStatements = {
  revenue: 0,
  costOfSales: 0,
  operatingExpenses: 0,
  interestExpense: 0,
  taxExpense: 0,
  currentAssets: 0,
  nonCurrentAssets: 0,
  currentLiabilities: 0,
  nonCurrentLiabilities: 0,
  equity: 0,
  operatingCashFlow: 0,
  investingCashFlow: 0,
  financingCashFlow: 0,
};

export function computeFinancialRatios(fs: Partial<FinancialStatements>): FinancialRatios {
  const revenue = Number(fs.revenue ?? 0);
  const costOfSales = Number(fs.costOfSales ?? 0);
  const operatingExpenses = Number(fs.operatingExpenses ?? 0);
  const interestExpense = Number(fs.interestExpense ?? 0);
  const taxExpense = Number(fs.taxExpense ?? 0);
  const currentAssets = Number(fs.currentAssets ?? 0);
  const nonCurrentAssets = Number(fs.nonCurrentAssets ?? 0);
  const currentLiabilities = Number(fs.currentLiabilities ?? 0);
  const nonCurrentLiabilities = Number(fs.nonCurrentLiabilities ?? 0);
  const equity = Number(fs.equity ?? 0);

  const grossProfit = revenue - costOfSales;
  const ebitda = grossProfit - operatingExpenses;
  const netIncome = ebitda - interestExpense - taxExpense;
  const totalAssets = currentAssets + nonCurrentAssets;
  const totalLiabilities = currentLiabilities + nonCurrentLiabilities;

  const currentRatio = safeDiv(currentAssets, currentLiabilities);
  const debtToEquity = safeDiv(totalLiabilities, equity);
  const roe = safeDiv(netIncome, equity);
  const roa = safeDiv(netIncome, totalAssets);

  const redFlags: string[] = [];
  if (currentRatio !== null && currentRatio < 1) {
    redFlags.push('Current ratio below 1.0 — short-term liquidity risk');
  }
  if (debtToEquity !== null && debtToEquity > 2) {
    redFlags.push('Debt-to-equity above 2.0 — elevated leverage');
  }
  if (pct(safeDiv(netIncome, revenue)) !== null && (pct(safeDiv(netIncome, revenue)) as number) < 0) {
    redFlags.push('Negative net margin for the period');
  }
  if (equity < 0) {
    redFlags.push('Negative equity position');
  }

  return {
    grossProfit,
    ebitda,
    netIncome,
    totalAssets,
    totalLiabilities,
    grossMarginPct: pct(safeDiv(grossProfit, revenue)),
    ebitdaMarginPct: pct(safeDiv(ebitda, revenue)),
    netMarginPct: pct(safeDiv(netIncome, revenue)),
    currentRatio: currentRatio === null ? null : Math.round(currentRatio * 100) / 100,
    debtToEquity: debtToEquity === null ? null : Math.round(debtToEquity * 100) / 100,
    returnOnEquityPct: pct(roe),
    returnOnAssetsPct: pct(roa),
    redFlags,
  };
}
