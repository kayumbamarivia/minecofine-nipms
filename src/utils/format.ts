export function formatRwf(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_000_000_000) return `RWF ${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `RWF ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `RWF ${(amount / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}
