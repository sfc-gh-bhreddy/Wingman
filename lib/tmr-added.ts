import type { Deal } from "./types.ts";

/** Snowflake fiscal year starts Feb 1: FY27 Q1 = Feb-Apr 2026. */
export interface FiscalQuarter { fy: number; fq: number }

export function fiscalQuarterOf(isoDate: string): FiscalQuarter | null {
  const m = /^(\d{4})-(\d{2})/.exec(isoDate);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return { fy: month >= 2 ? year + 1 : year, fq: Math.floor(((month + 10) % 12) / 3) + 1 };
}

export function currentFiscalQuarter(now: Date): FiscalQuarter {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  return fiscalQuarterOf(iso)!;
}

export function quarterLabel(q: FiscalQuarter): string {
  return `FY${String(q.fy).slice(-2)} Q${q.fq}`;
}

/** One deal per account so each account counts once. */
function accounts(deals: Deal[]): Deal[] {
  const seen = new Map<string, Deal>();
  for (const deal of deals) if (!seen.has(deal.accountId)) seen.set(deal.accountId, deal);
  return [...seen.values()];
}

/**
 * Unique roster accounts whose first ASE TMR falls in the given quarter,
 * grouped by key. Accounts without a TMR date are not counted.
 */
export function tmrAddedBy(
  deals: Deal[],
  tmrDates: Record<string, string>,
  quarter: FiscalQuarter,
  keyOf: (deal: Deal) => string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const deal of accounts(deals)) {
    const date = tmrDates[deal.accountId];
    const q = date ? fiscalQuarterOf(date) : null;
    if (!q || q.fy !== quarter.fy || q.fq !== quarter.fq) continue;
    const key = keyOf(deal);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Top N groups by count; ties broken alphabetically. Zero counts are omitted. */
export function topAdded(counts: Map<string, number>, n = 3): { key: string; added: number }[] {
  return [...counts.entries()]
    .filter(([, added]) => added > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([key, added]) => ({ key, added }));
}

/** Quarters of the fiscal year that have started, oldest first. */
export function quartersSoFar(now: Date): FiscalQuarter[] {
  const cur = currentFiscalQuarter(now);
  return Array.from({ length: cur.fq }, (_, i) => ({ fy: cur.fy, fq: i + 1 }));
}

/**
 * The accounts behind a tmrAddedBy count: unique accounts whose first ASE TMR
 * falls in the quarter and whose key matches. Newest TMR first.
 */
export function tmrAddedAccounts(
  deals: Deal[],
  tmrDates: Record<string, string>,
  quarter: FiscalQuarter,
  keyOf: (deal: Deal) => string,
  key: string,
): { deal: Deal; tmrDate: string }[] {
  const rows: { deal: Deal; tmrDate: string }[] = [];
  for (const deal of accounts(deals)) {
    const date = tmrDates[deal.accountId];
    const q = date ? fiscalQuarterOf(date) : null;
    if (!q || q.fy !== quarter.fy || q.fq !== quarter.fq || keyOf(deal) !== key) continue;
    rows.push({ deal, tmrDate: date });
  }
  return rows.sort((a, b) => b.tmrDate.localeCompare(a.tmrDate));
}
