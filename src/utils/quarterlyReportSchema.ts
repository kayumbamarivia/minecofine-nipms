/**
 * Quarterly Financial Reporting Template schema —
 * mirrors the MINECOFIN Excel pack (statement lines + KPI dashboard).
 */

export type AmountKey = 'priorYear' | 'currentQuarter' | 'ytd' | 'budget';

export const AMOUNT_COLUMNS: AmountKey[] = [
  'priorYear',
  'currentQuarter',
  'ytd',
  'budget',
];

export interface AmountRow {
  priorYear: number;
  currentQuarter: number;
  ytd: number;
  budget: number;
}

export type LineKind = 'header' | 'line' | 'total' | 'subtotal';

export interface StatementLineDef {
  key: string;
  label: string;
  note?: string;
  kind: LineKind;
  /** Keys added into this total/subtotal */
  sumOf?: string[];
  /** Keys subtracted from this total (enter absolute positives in the form) */
  lessOf?: string[];
}

export interface TrialBalanceRow {
  id: string;
  glCode: string;
  accountDescription: string;
  noteRef: string;
  priorYearDebit: number;
  priorYearCredit: number;
  currentQuarterDebit: number;
  currentQuarterCredit: number;
  ytdDebit: number;
  ytdCredit: number;
  budgetDebit: number;
  budgetCredit: number;
  mapsTo: 'Balance Sheet' | 'Income Statement' | 'Cash Flow' | '';
  statementRow: string;
  source: string;
}

export function emptyTrialBalanceRow(): TrialBalanceRow {
  return {
    id: crypto.randomUUID(),
    glCode: '',
    accountDescription: '',
    noteRef: '',
    priorYearDebit: 0,
    priorYearCredit: 0,
    currentQuarterDebit: 0,
    currentQuarterCredit: 0,
    ytdDebit: 0,
    ytdCredit: 0,
    budgetDebit: 0,
    budgetCredit: 0,
    mapsTo: '',
    statementRow: '',
    source: '',
  };
}

export interface DisclosureNoteRow {
  ref: string;
  title: string;
  currentQuarter: string;
  ytd: string;
  budget: string;
  disclosure: string;
  supportingSchedule: string;
}

export function initDisclosureNotes(defs: StatementLineDef[]): DisclosureNoteRow[] {
  const notes = new Map<string, string>();
  for (const def of defs) {
    if (def.note && !notes.has(def.note)) notes.set(def.note, def.label);
  }
  return Array.from(notes, ([ref, title]) => ({
    ref,
    title,
    currentQuarter: '',
    ytd: '',
    budget: '',
    disclosure: '',
    supportingSchedule: '',
  }));
}

export interface FinancialAnalysisComments {
  liquidityObservations: string;
  liquidityActions: string;
  solvencyObservations: string;
  solvencyActions: string;
  profitabilityObservations: string;
  profitabilityActions: string;
  strategicOutlook: string;
  strategicActions: string;
}

export const EMPTY_ANALYSIS_COMMENTS: FinancialAnalysisComments = {
  liquidityObservations: '',
  liquidityActions: '',
  solvencyObservations: '',
  solvencyActions: '',
  profitabilityObservations: '',
  profitabilityActions: '',
  strategicOutlook: '',
  strategicActions: '',
};

export const EMPTY_AMOUNT: AmountRow = {
  priorYear: 0,
  currentQuarter: 0,
  ytd: 0,
  budget: 0,
};

export function emptyAmount(): AmountRow {
  return { ...EMPTY_AMOUNT };
}

export function variance(row: AmountRow): number {
  return Number(row.budget || 0) - Number(row.ytd || 0);
}

export const BALANCE_SHEET_LINES: StatementLineDef[] = [
  { key: 'nca_header', label: 'NON-CURRENT ASSETS', kind: 'header' },
  { key: 'ppe', label: 'Property, Plant & Equipment', note: '1.1', kind: 'line' },
  { key: 'rouAssets', label: 'Right-of-Use Assets (IFRS 16)', note: '1.2', kind: 'line' },
  { key: 'intangibles', label: 'Intangible Assets', note: '1.3', kind: 'line' },
  { key: 'goodwill', label: 'Goodwill', note: '1.4', kind: 'line' },
  { key: 'biologicalAssetsNC', label: 'Biological Assets (IAS 41)', note: '1.5', kind: 'line' },
  { key: 'investmentProperty', label: 'Investment Property', note: '1.6', kind: 'line' },
  { key: 'longTermInvestments', label: 'Long-term Investments', note: '1.7', kind: 'line' },
  { key: 'deferredTaxAssets', label: 'Deferred Tax Assets', note: '1.8', kind: 'line' },
  {
    key: 'totalNonCurrentAssets',
    label: 'Total Non-Current Assets',
    kind: 'total',
    sumOf: [
      'ppe',
      'rouAssets',
      'intangibles',
      'goodwill',
      'biologicalAssetsNC',
      'investmentProperty',
      'longTermInvestments',
      'deferredTaxAssets',
    ],
  },
  { key: 'ca_header', label: 'CURRENT ASSETS', kind: 'header' },
  { key: 'inventories', label: 'Inventories', note: '1.9', kind: 'line' },
  {
    key: 'biologicalAssetsCurrent',
    label: 'Biological Assets - Current (IAS 41)',
    note: '1.10',
    kind: 'line',
  },
  { key: 'tradeReceivables', label: 'Trade and Other Receivables', note: '1.11', kind: 'line' },
  { key: 'contractAssets', label: 'Contract Assets (IFRS 15)', note: '1.12', kind: 'line' },
  {
    key: 'relatedPartyReceivables',
    label: 'Related Party Receivables (IAS 24)',
    note: '1.15',
    kind: 'line',
  },
  { key: 'prepayments', label: 'Prepayments', note: '1.13', kind: 'line' },
  { key: 'cash', label: 'Cash and Cash Equivalents', note: '1.14', kind: 'line' },
  {
    key: 'totalCurrentAssets',
    label: 'Total Current Assets',
    kind: 'total',
    sumOf: [
      'inventories',
      'biologicalAssetsCurrent',
      'tradeReceivables',
      'contractAssets',
      'relatedPartyReceivables',
      'prepayments',
      'cash',
    ],
  },
  {
    key: 'totalAssets',
    label: 'TOTAL ASSETS',
    kind: 'total',
    sumOf: ['totalNonCurrentAssets', 'totalCurrentAssets'],
  },
  { key: 'eq_header', label: 'EQUITY', kind: 'header' },
  { key: 'shareCapital', label: 'Share Capital', note: '2.1', kind: 'line' },
  { key: 'sharePremium', label: 'Share Premium', note: '2.2', kind: 'line' },
  { key: 'retainedEarnings', label: 'Retained Earnings', note: '2.3', kind: 'line' },
  { key: 'otherReserves', label: 'Other Reserves', note: '2.4', kind: 'line' },
  { key: 'unallocatedShareCapital', label: 'Unallocated Share Capital', note: '2.5', kind: 'line' },
  {
    key: 'totalEquity',
    label: 'Total Equity',
    kind: 'total',
    sumOf: [
      'shareCapital',
      'sharePremium',
      'retainedEarnings',
      'otherReserves',
      'unallocatedShareCapital',
    ],
  },
  { key: 'ncl_header', label: 'NON-CURRENT LIABILITIES', kind: 'header' },
  { key: 'longTermBorrowings', label: 'Long-term Borrowings', note: '3.1', kind: 'line' },
  {
    key: 'leaseLiabilitiesNC',
    label: 'Lease Liabilities - Non-current (IFRS 16)',
    note: '3.2',
    kind: 'line',
  },
  { key: 'deferredTaxLiabilities', label: 'Deferred Tax Liabilities', note: '3.3', kind: 'line' },
  { key: 'provisionsNC', label: 'Provisions - Non-current', note: '3.4', kind: 'line' },
  {
    key: 'employeeBenefits',
    label: 'Employee Benefits Liability (IAS 19)',
    note: '3.5',
    kind: 'line',
  },
  { key: 'governmentLoans', label: 'Government Loans (Non-current)', note: '3.6', kind: 'line' },
  {
    key: 'deferredGovGrant',
    label: 'Deferred Government Grant (IAS 20)',
    note: '3.7',
    kind: 'line',
  },
  { key: 'deferredIncome', label: 'Deferred Income', note: '3.8', kind: 'line' },
  {
    key: 'totalNonCurrentLiabilities',
    label: 'Total Non-Current Liabilities',
    kind: 'total',
    sumOf: [
      'longTermBorrowings',
      'leaseLiabilitiesNC',
      'deferredTaxLiabilities',
      'provisionsNC',
      'employeeBenefits',
      'governmentLoans',
      'deferredGovGrant',
      'deferredIncome',
    ],
  },
  { key: 'cl_header', label: 'CURRENT LIABILITIES', kind: 'header' },
  { key: 'tradePayables', label: 'Trade and Other Payables', note: '3.9', kind: 'line' },
  { key: 'contractLiabilities', label: 'Contract Liabilities (IFRS 15)', note: '3.10', kind: 'line' },
  {
    key: 'leaseLiabilitiesCurrent',
    label: 'Lease Liabilities - Current (IFRS 16)',
    note: '3.11',
    kind: 'line',
  },
  {
    key: 'relatedPartyPayables',
    label: 'Related Party Payables (IAS 24)',
    note: '3.12',
    kind: 'line',
  },
  { key: 'shortTermBorrowings', label: 'Short-term Borrowings', note: '3.13', kind: 'line' },
  { key: 'currentTaxLiabilities', label: 'Current Tax Liabilities', note: '3.14', kind: 'line' },
  { key: 'provisionsCurrent', label: 'Provisions - Current', note: '3.15', kind: 'line' },
  {
    key: 'totalCurrentLiabilities',
    label: 'Total Current Liabilities',
    kind: 'total',
    sumOf: [
      'tradePayables',
      'contractLiabilities',
      'leaseLiabilitiesCurrent',
      'relatedPartyPayables',
      'shortTermBorrowings',
      'currentTaxLiabilities',
      'provisionsCurrent',
    ],
  },
  {
    key: 'totalLiabilities',
    label: 'TOTAL LIABILITIES',
    kind: 'total',
    sumOf: ['totalNonCurrentLiabilities', 'totalCurrentLiabilities'],
  },
  {
    key: 'totalEquityAndLiabilities',
    label: 'TOTAL EQUITY AND LIABILITIES',
    kind: 'total',
    sumOf: ['totalEquity', 'totalLiabilities'],
  },
];

export const INCOME_STATEMENT_LINES: StatementLineDef[] = [
  { key: 'rev_header', label: 'REVENUE', kind: 'header' },
  {
    key: 'contractRevenue',
    label: 'Revenue from Contracts with Customers (IFRS 15)',
    note: '4.1',
    kind: 'line',
  },
  { key: 'serviceRevenue', label: 'Service Revenue', note: '4.2', kind: 'line' },
  { key: 'biologicalGains', label: 'Gains on Biological Assets (IAS 41)', note: '4.3', kind: 'line' },
  {
    key: 'rentalIncome',
    label: 'Rental Income from Investment Property',
    note: '4.4',
    kind: 'line',
  },
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    kind: 'total',
    sumOf: ['contractRevenue', 'serviceRevenue', 'biologicalGains', 'rentalIncome'],
  },
  { key: 'oi_header', label: 'OTHER INCOME', kind: 'header' },
  { key: 'govGrantIncome', label: 'Government Grant Income (IAS 20)', note: '4.5', kind: 'line' },
  { key: 'otherGrants', label: 'Other Grants', note: '4.6', kind: 'line' },
  { key: 'otherIncome', label: 'Other Income', note: '4.7', kind: 'line' },
  {
    key: 'totalOtherIncome',
    label: 'Total Other Income',
    kind: 'total',
    sumOf: ['govGrantIncome', 'otherGrants', 'otherIncome'],
  },
  {
    key: 'totalIncome',
    label: 'TOTAL INCOME',
    kind: 'total',
    sumOf: ['totalRevenue', 'totalOtherIncome'],
  },
  { key: 'cos_header', label: 'COST OF SALES', kind: 'header' },
  { key: 'cogs', label: 'Cost of Goods Sold', note: '5.1', kind: 'line' },
  { key: 'costOfServices', label: 'Cost of Services', note: '5.2', kind: 'line' },
  {
    key: 'bioAssetChanges',
    label: 'Changes in Biological Assets (IAS 41)',
    note: '5.3',
    kind: 'line',
  },
  {
    key: 'directCostsInvestmentProperty',
    label: 'Direct Costs - Investment Property',
    note: '5.4',
    kind: 'line',
  },
  {
    key: 'totalCostOfSales',
    label: 'Total Cost of Sales',
    kind: 'total',
    sumOf: ['cogs', 'costOfServices', 'bioAssetChanges', 'directCostsInvestmentProperty'],
  },
  {
    key: 'grossProfit',
    label: 'GROSS PROFIT',
    kind: 'total',
    sumOf: ['totalIncome'],
    lessOf: ['totalCostOfSales'],
  },
  { key: 'opex_header', label: 'OPERATING EXPENSES', kind: 'header' },
  {
    key: 'employeeBenefitsExpense',
    label: 'Employee Benefits Expense (IAS 19)',
    note: '6.1',
    kind: 'line',
  },
  { key: 'depreciationPpe', label: 'Depreciation - PPE (IAS 16)', note: '6.2', kind: 'line' },
  {
    key: 'depreciationRou',
    label: 'Depreciation - Right-of-Use Assets (IFRS 16)',
    note: '6.3',
    kind: 'line',
  },
  {
    key: 'amortisationIntangibles',
    label: 'Amortisation - Intangibles (IAS 38)',
    note: '6.4',
    kind: 'line',
  },
  { key: 'impairmentLosses', label: 'Impairment Losses (IAS 36)', note: '6.5', kind: 'line' },
  { key: 'leaseInterest', label: 'Lease Interest Expense (IFRS 16)', note: '6.6', kind: 'line' },
  { key: 'professionalFees', label: 'Professional Fees', note: '6.7', kind: 'line' },
  { key: 'marketing', label: 'Marketing & Advertising', note: '6.8', kind: 'line' },
  { key: 'adminExpenses', label: 'Administrative Expenses', note: '6.9', kind: 'line' },
  { key: 'eclCharge', label: 'Expected Credit Losses (IFRS 9)', note: '6.10', kind: 'line' },
  { key: 'otherOperatingExpenses', label: 'Other Operating Expenses', note: '6.11', kind: 'line' },
  {
    key: 'totalOperatingExpenses',
    label: 'Total Operating Expenses',
    kind: 'total',
    sumOf: [
      'employeeBenefitsExpense',
      'depreciationPpe',
      'depreciationRou',
      'amortisationIntangibles',
      'impairmentLosses',
      'leaseInterest',
      'professionalFees',
      'marketing',
      'adminExpenses',
      'eclCharge',
      'otherOperatingExpenses',
    ],
  },
  {
    key: 'operatingProfit',
    label: 'OPERATING PROFIT',
    kind: 'total',
    sumOf: ['grossProfit'],
    lessOf: ['totalOperatingExpenses'],
  },
  { key: 'fin_header', label: 'FINANCE ITEMS', kind: 'header' },
  { key: 'financeIncome', label: 'Finance Income', note: '7.1', kind: 'line' },
  { key: 'financeCosts', label: 'Finance Costs', note: '7.2', kind: 'line' },
  { key: 'fxGainLoss', label: 'Net Foreign Exchange Gain/(Loss)', note: '7.3', kind: 'line' },
  {
    key: 'shareOfAssociates',
    label: 'Share of Profit from Associates (IAS 28)',
    note: '7.4',
    kind: 'line',
  },
  {
    key: 'profitBeforeTax',
    label: 'PROFIT BEFORE TAX',
    kind: 'total',
    sumOf: ['operatingProfit', 'financeIncome', 'fxGainLoss', 'shareOfAssociates'],
    lessOf: ['financeCosts'],
  },
  { key: 'incomeTaxExpense', label: 'Income Tax Expense (IAS 12)', note: '8.1', kind: 'line' },
  {
    key: 'profitForPeriod',
    label: 'PROFIT FOR THE PERIOD',
    kind: 'total',
    sumOf: ['profitBeforeTax'],
    lessOf: ['incomeTaxExpense'],
  },
  { key: 'oci_header', label: 'OTHER COMPREHENSIVE INCOME (OCI)', kind: 'header' },
  { key: 'revaluationSurplus', label: 'Revaluation Surplus - PPE (IAS 16)', kind: 'line' },
  {
    key: 'dbPlanRemeasurement',
    label: 'Remeasurement of Defined Benefit Plans (IAS 19)',
    kind: 'line',
  },
  {
    key: 'fvEquityChanges',
    label: 'Fair Value Changes - Equity Instruments (IFRS 9)',
    kind: 'line',
  },
  { key: 'fxTranslation', label: 'Foreign Currency Translation Differences', kind: 'line' },
  { key: 'cashFlowHedges', label: 'Cash Flow Hedges (IFRS 9)', kind: 'line' },
  {
    key: 'totalOci',
    label: 'Total Other Comprehensive Income',
    kind: 'total',
    sumOf: [
      'revaluationSurplus',
      'dbPlanRemeasurement',
      'fvEquityChanges',
      'fxTranslation',
      'cashFlowHedges',
    ],
  },
  {
    key: 'totalComprehensiveIncome',
    label: 'TOTAL COMPREHENSIVE INCOME',
    kind: 'total',
    sumOf: ['profitForPeriod', 'totalOci'],
  },
];

export const CASH_FLOW_LINES: StatementLineDef[] = [
  { key: 'op_header', label: 'CASH FLOWS FROM OPERATING ACTIVITIES', kind: 'header' },
  { key: 'profitBeforeTax', label: 'Profit before tax', note: 'IS', kind: 'line' },
  { key: 'adj_header', label: 'Adjustments for:', kind: 'header' },
  { key: 'addDepreciationPpe', label: 'Depreciation of PPE (IAS 16)', note: '6.2', kind: 'line' },
  {
    key: 'addDepreciationRou',
    label: 'Depreciation of Right-of-Use Assets (IFRS 16)',
    note: '6.3',
    kind: 'line',
  },
  {
    key: 'addAmortisation',
    label: 'Amortisation of Intangibles (IAS 38)',
    note: '6.4',
    kind: 'line',
  },
  { key: 'addImpairment', label: 'Impairment Losses (IAS 36)', note: '6.5', kind: 'line' },
  { key: 'addNetFinanceCosts', label: 'Net Finance Costs', kind: 'line' },
  { key: 'lessShareAssociates', label: 'Share of Profit from Associates', kind: 'line' },
  { key: 'lessBioGains', label: 'Gain on Biological Assets', note: '1.5', kind: 'line' },
  { key: 'wc_header', label: 'Changes in Working Capital:', kind: 'header' },
  { key: 'changeReceivables', label: '(Increase)/Decrease in Trade Receivables', kind: 'line' },
  { key: 'changeInventories', label: '(Increase)/Decrease in Inventories', kind: 'line' },
  {
    key: 'changeBiologicalAssets',
    label: '(Increase)/Decrease in Biological Assets',
    kind: 'line',
  },
  { key: 'changePayables', label: 'Increase/(Decrease) in Trade Payables', kind: 'line' },
  {
    key: 'changeContractLiabilities',
    label: 'Increase/(Decrease) in Contract Liabilities',
    kind: 'line',
  },
  {
    key: 'cashFromOperations',
    label: 'Cash Generated from Operations',
    kind: 'subtotal',
    sumOf: [
      'profitBeforeTax',
      'addDepreciationPpe',
      'addDepreciationRou',
      'addAmortisation',
      'addImpairment',
      'addNetFinanceCosts',
      'lessShareAssociates',
      'lessBioGains',
      'changeReceivables',
      'changeInventories',
      'changeBiologicalAssets',
      'changePayables',
      'changeContractLiabilities',
    ],
  },
  { key: 'taxesPaid', label: 'Income Taxes Paid', kind: 'line' },
  {
    key: 'netOperatingCash',
    label: 'Net Cash from Operating Activities',
    kind: 'total',
    sumOf: ['cashFromOperations', 'taxesPaid'],
  },
  { key: 'inv_header', label: 'CASH FLOWS FROM INVESTING ACTIVITIES', kind: 'header' },
  {
    key: 'purchasePpe',
    label: 'Purchase of Property, Plant & Equipment',
    note: '1.1',
    kind: 'line',
  },
  { key: 'proceedsSalePpe', label: 'Proceeds from Sale of PPE', kind: 'line' },
  { key: 'purchaseIntangibles', label: 'Purchase of Intangible Assets', kind: 'line' },
  {
    key: 'acquireBiologicalAssets',
    label: 'Acquisition of Biological Assets',
    note: '1.5',
    kind: 'line',
  },
  { key: 'proceedsSaleBio', label: 'Proceeds from Sale of Biological Assets', kind: 'line' },
  { key: 'purchaseInvestmentProperty', label: 'Purchase of Investment Property', kind: 'line' },
  { key: 'dividendsFromAssociates', label: 'Dividends Received from Associates', kind: 'line' },
  {
    key: 'netInvestingCash',
    label: 'Net Cash from Investing Activities',
    kind: 'total',
    sumOf: [
      'purchasePpe',
      'proceedsSalePpe',
      'purchaseIntangibles',
      'acquireBiologicalAssets',
      'proceedsSaleBio',
      'purchaseInvestmentProperty',
      'dividendsFromAssociates',
    ],
  },
  { key: 'fin_header', label: 'CASH FLOWS FROM FINANCING ACTIVITIES', kind: 'header' },
  { key: 'proceedsShareCapital', label: 'Proceeds from Issuance of Share Capital', kind: 'line' },
  {
    key: 'proceedsLongTermBorrowings',
    label: 'Proceeds from Long-term Borrowings',
    note: '3.1',
    kind: 'line',
  },
  {
    key: 'repayLongTermBorrowings',
    label: 'Repayment of Long-term Borrowings',
    note: '3.1',
    kind: 'line',
  },
  {
    key: 'leasePrincipalPaid',
    label: 'Payment of Lease Liabilities - Principal (IFRS 16)',
    note: '3.2',
    kind: 'line',
  },
  {
    key: 'leaseInterestPaid',
    label: 'Payment of Lease Liabilities - Interest (IFRS 16)',
    note: '3.2',
    kind: 'line',
  },
  { key: 'interestPaidBorrowings', label: 'Interest Paid on Borrowings', kind: 'line' },
  { key: 'dividendsPaid', label: 'Dividends Paid', kind: 'line' },
  {
    key: 'netFinancingCash',
    label: 'Net Cash from Financing Activities',
    kind: 'total',
    sumOf: [
      'proceedsShareCapital',
      'proceedsLongTermBorrowings',
      'repayLongTermBorrowings',
      'leasePrincipalPaid',
      'leaseInterestPaid',
      'interestPaidBorrowings',
      'dividendsPaid',
    ],
  },
  {
    key: 'netCashChange',
    label: 'NET INCREASE/(DECREASE) IN CASH',
    kind: 'total',
    sumOf: ['netOperatingCash', 'netInvestingCash', 'netFinancingCash'],
  },
  { key: 'cashOpening', label: 'Cash and Cash Equivalents at Beginning of Period', kind: 'line' },
  {
    key: 'cashClosing',
    label: 'Cash and Cash Equivalents at End of Period',
    kind: 'total',
    sumOf: ['netCashChange', 'cashOpening'],
  },
];

export const EQUITY_LINES: StatementLineDef[] = [
  { key: 'openingEquity', label: 'Balance at start of period', kind: 'line' },
  { key: 'profitForPeriod', label: 'Profit for the period', kind: 'line' },
  { key: 'otherComprehensiveIncome', label: 'Total other comprehensive income', kind: 'line' },
  { key: 'dividends', label: 'Dividends paid', kind: 'line' },
  { key: 'shareCapitalIssued', label: 'Issue of share capital', kind: 'line' },
  {
    key: 'closingEquity',
    label: 'Balance at end of period',
    kind: 'total',
    sumOf: [
      'openingEquity',
      'profitForPeriod',
      'otherComprehensiveIncome',
      'shareCapitalIssued',
    ],
    lessOf: ['dividends'],
  },
];

export interface KpiDef {
  key: string;
  label: string;
  unit?: string;
  notes?: string;
}

export const OPERATIONAL_KPIS: KpiDef[] = [
  {
    key: 'OP-1',
    label: 'Production Capacity Utilisation (%)',
    unit: '%',
    notes: 'Target: >=85% utilisation',
  },
  { key: 'OP-2', label: 'Units Produced (volume)', notes: 'Total production output' },
  {
    key: 'OP-3',
    label: 'On-Time Delivery Rate (%)',
    unit: '%',
    notes: '% orders delivered on schedule',
  },
  {
    key: 'OP-4',
    label: 'Customer Satisfaction Score (%)',
    unit: '%',
    notes: 'Based on customer surveys',
  },
  {
    key: 'OP-5',
    label: 'Customer Retention Rate (%)',
    unit: '%',
    notes: 'Repeat / Total customers',
  },
  { key: 'OP-6', label: 'Other operational KPI (specify)' },
  { key: 'OP-7', label: 'Other operational KPI (specify)' },
  { key: 'OP-8', label: 'Other operational KPI (specify)' },
  { key: 'OP-9', label: 'Other operational KPI (specify)' },
  { key: 'OP-10', label: 'Other operational KPI (specify)' },
];

export const GOVERNANCE_KPIS: KpiDef[] = [
  {
    key: 'GV-1',
    label: 'Board Meetings Held (per year / YTD)',
    notes: 'Min 4 quarterly meetings',
  },
  { key: 'GV-2', label: 'Board Attendance Rate (%)', unit: '%', notes: 'Average attendance' },
  {
    key: 'GV-3',
    label: 'Regulatory Compliance Rate (%)',
    unit: '%',
    notes: '% regulations complied with',
  },
  {
    key: 'GV-4',
    label: 'Audit Findings Resolved (%)',
    unit: '%',
    notes: 'Findings closed on time',
  },
  {
    key: 'GV-5',
    label: 'Internal Audit Plan Completion (%)',
    unit: '%',
    notes: '% planned audits completed',
  },
  { key: 'GV-6', label: 'Other governance KPI (specify)' },
  { key: 'GV-7', label: 'Other governance KPI (specify)' },
  { key: 'GV-8', label: 'Other governance KPI (specify)' },
  { key: 'GV-9', label: 'Other governance KPI (specify)' },
  { key: 'GV-10', label: 'Other governance KPI (specify)' },
];

export interface KpiRow {
  key: string;
  label: string;
  customLabel: string;
  priorYear: string;
  currentQuarter: string;
  ytd: string;
  target: string;
  notes: string;
}

export function emptyKpiRows(defs: KpiDef[]): KpiRow[] {
  return defs.map((d) => ({
    key: d.key,
    label: d.label,
    customLabel: '',
    priorYear: '',
    currentQuarter: '',
    ytd: '',
    target: '',
    notes: d.notes ?? '',
  }));
}

export type StatementMap = Record<string, AmountRow>;

export function initStatementMap(defs: StatementLineDef[]): StatementMap {
  const map: StatementMap = {};
  for (const def of defs) {
    if (def.kind === 'header') continue;
    map[def.key] = emptyAmount();
  }
  return map;
}

export function sumAmountRows(rows: AmountRow[]): AmountRow {
  return rows.reduce(
    (acc, row) => ({
      priorYear: acc.priorYear + Number(row.priorYear || 0),
      currentQuarter: acc.currentQuarter + Number(row.currentQuarter || 0),
      ytd: acc.ytd + Number(row.ytd || 0),
      budget: acc.budget + Number(row.budget || 0),
    }),
    emptyAmount(),
  );
}

function subtractAmountRows(base: AmountRow, less: AmountRow[]): AmountRow {
  return less.reduce(
    (acc, row) => ({
      priorYear: acc.priorYear - Number(row.priorYear || 0),
      currentQuarter: acc.currentQuarter - Number(row.currentQuarter || 0),
      ytd: acc.ytd - Number(row.ytd || 0),
      budget: acc.budget - Number(row.budget || 0),
    }),
    { ...base },
  );
}

/** Recompute total/subtotal rows from editable lines. */
export function recomputeTotals(defs: StatementLineDef[], map: StatementMap): StatementMap {
  const next: StatementMap = { ...map };
  for (const def of defs) {
    if (def.kind !== 'total' && def.kind !== 'subtotal') continue;
    const added = sumAmountRows((def.sumOf ?? []).map((key) => next[key] ?? emptyAmount()));
    const result = subtractAmountRows(
      added,
      (def.lessOf ?? []).map((key) => next[key] ?? emptyAmount()),
    );
    next[def.key] = result;
  }
  return next;
}

export interface QuarterlyCover {
  companyId: string;
  companyName: string;
  sector: string;
  reportingPeriod: string;
  preparedByName: string;
  preparedByTitle: string;
  preparedByDate: string;
  authorizedByName: string;
  authorizedByTitle: string;
  authorizedByDate: string;
}

export interface QuarterlyReportPayload {
  templateVersion: 'quarterly_fs_v2';
  cover: QuarterlyCover;
  trialBalance: TrialBalanceRow[];
  balanceSheet: StatementMap;
  incomeStatement: StatementMap;
  cashFlow: StatementMap;
  changesInEquity: StatementMap;
  balanceSheetNotes: DisclosureNoteRow[];
  incomeStatementNotes: DisclosureNoteRow[];
  financialAnalysisComments: FinancialAnalysisComments;
  operationalKpis: KpiRow[];
  governanceKpis: KpiRow[];
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

function amt(map: StatementMap, key: string, field: AmountKey = 'currentQuarter'): number {
  return Number(map[key]?.[field] ?? 0);
}

export function deriveFinancialStatements(
  balanceSheet: StatementMap,
  incomeStatement: StatementMap,
  cashFlow: StatementMap,
  field: AmountKey = 'currentQuarter',
): QuarterlyReportPayload['financialStatements'] {
  const bs = recomputeTotals(BALANCE_SHEET_LINES, balanceSheet);
  const is = recomputeTotals(INCOME_STATEMENT_LINES, incomeStatement);
  const cf = recomputeTotals(CASH_FLOW_LINES, cashFlow);

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

export function buildQuarterlyPayload(input: {
  cover: QuarterlyCover;
  trialBalance: TrialBalanceRow[];
  balanceSheet: StatementMap;
  incomeStatement: StatementMap;
  cashFlow: StatementMap;
  changesInEquity: StatementMap;
  balanceSheetNotes: DisclosureNoteRow[];
  incomeStatementNotes: DisclosureNoteRow[];
  financialAnalysisComments: FinancialAnalysisComments;
  operationalKpis: KpiRow[];
  governanceKpis: KpiRow[];
  documentChecklist: QuarterlyReportPayload['documentChecklist'];
}): QuarterlyReportPayload {
  const balanceSheet = recomputeTotals(BALANCE_SHEET_LINES, input.balanceSheet);
  const incomeStatement = recomputeTotals(INCOME_STATEMENT_LINES, input.incomeStatement);
  const cashFlow = recomputeTotals(CASH_FLOW_LINES, input.cashFlow);
  const changesInEquity = recomputeTotals(EQUITY_LINES, input.changesInEquity);
  const financialStatements = deriveFinancialStatements(balanceSheet, incomeStatement, cashFlow);

  const op1 = input.operationalKpis.find((k) => k.key === 'OP-1');
  const op2 = input.operationalKpis.find((k) => k.key === 'OP-2');
  const gv1 = input.governanceKpis.find((k) => k.key === 'GV-1');
  const gv3 = input.governanceKpis.find((k) => k.key === 'GV-3');

  return {
    templateVersion: 'quarterly_fs_v2',
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
      metric1: op1?.ytd || op1?.currentQuarter || '',
      metric2: op2?.ytd || op2?.currentQuarter || '',
      notes: input.operationalKpis
        .filter((k) => k.notes.trim())
        .map((k) => `${k.key}: ${k.notes}`)
        .join('; '),
    },
    governanceMetrics: {
      boardMeetingsHeld: gv1?.ytd || gv1?.currentQuarter || '',
      governanceScore: gv3?.ytd || gv3?.currentQuarter || '',
      notes: input.governanceKpis
        .filter((k) => k.notes.trim())
        .map((k) => `${k.key}: ${k.notes}`)
        .join('; '),
    },
  };
}
