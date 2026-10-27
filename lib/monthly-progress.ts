import type { Deal } from "./types";

export const MONTHLY_TARGET = 12;
export const REPORTING_TIMEZONE = "America/New_York";
export const NO_DISTRICT = "(No district)";
export const NO_SEM = "(No SE manager)";

export interface MonthlyPair {
  key: string;
  district: string;
  sem: string;
  month: string;
  target: number | null;
  actual: number | null;
  unknownAccounts: number;
  accounts: Deal[];
  partial: boolean;
  evidenceCheckedAt: string | null;
}

export function monthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORTING_TIMEZONE, year: "numeric", month: "2-digit",
  }).formatToParts(date);
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}

export function pairKey(district: string, sem: string): string {
  return JSON.stringify([district, sem]);
}

function attribution(deal: Deal): [string, string] {
  return [deal.firstAseDistrict ?? deal.district ?? NO_DISTRICT,
    deal.firstAseSem ?? deal.seManager ?? NO_SEM];
}

export function monthlyPairs(deals: Deal[], now: Date): MonthlyPair[] {
  const month = monthKey(now);
  const pairs = new Map<string, MonthlyPair>();
  const accountRows = new Map<string, Deal[]>();
  function ensure(district: string, sem: string) {
    const key = pairKey(district, sem);
    if (!pairs.has(key)) pairs.set(key, {
      key, district, sem, month,
      target: district === NO_DISTRICT || sem === NO_SEM ? null : MONTHLY_TARGET,
      actual: 0, unknownAccounts: 0, accounts: [], partial: false, evidenceCheckedAt: null,
    });
    return pairs.get(key)!;
  }
  for (const deal of deals) {
    ensure(deal.district ?? NO_DISTRICT, deal.seManager ?? NO_SEM);
    const rows = accountRows.get(deal.accountId) ?? [];
    rows.push(deal);
    accountRows.set(deal.accountId, rows);
  }
  for (const [accountId, rows] of accountRows) {
    const first = rows[0];
    const at = first.firstAseEvidenceAt;
    const timestamp = at ? Date.parse(at) : null;
    // Require a complete historical assessment, including never-qualified accounts.
    // Current coverage flags alone cannot distinguish zero additions from missing history.
    const valid = Boolean(accountId) && rows.every(row => row.aseHistoryComplete === true &&
      row.firstAseEvidenceAt === at && row.firstAseDistrict === first.firstAseDistrict &&
      row.firstAseSem === first.firstAseSem) &&
      (at === null ? rows.every(row => !row.hasAnyAse) :
        Boolean(at && /(?:Z|[+-]\d{2}:\d{2})$/.test(at) && timestamp !== null &&
          Number.isFinite(timestamp) && timestamp <= now.getTime() &&
          first.firstAseDistrict && first.firstAseSem && first.firstAseEvidenceSource));
    if (!valid) {
      const affected = new Set(rows.map(row => {
        const pair = ensure(...attribution(row));
        return pair.key;
      }));
      for (const key of affected) pairs.get(key)!.unknownAccounts++;
      const evidence = first.aseLiveEvidence;
      // Date-grain source evidence is intentionally separate from exact, complete history.
      if (evidence && accountId && /^\d{4}-\d{2}-\d{2}$/.test(evidence.date) &&
          Number.isFinite(Date.parse(evidence.date)) &&
          new Date(evidence.date).toISOString().slice(0, 10) === evidence.date &&
          evidence.date.slice(0, 7) === month && evidence.district && evidence.sem && evidence.source &&
          /(?:Z|[+-]\d{2}:\d{2})$/.test(evidence.checkedAt) &&
          Number.isFinite(Date.parse(evidence.checkedAt)) && Date.parse(evidence.checkedAt) <= now.getTime() &&
          evidence.date <= evidence.checkedAt.slice(0, 10) &&
          rows.every(row => row.aseHistoryComplete !== true &&
            row.aseLiveEvidence?.date === evidence.date &&
            row.aseLiveEvidence?.source === evidence.source &&
            row.aseLiveEvidence?.district === evidence.district &&
            row.aseLiveEvidence?.sem === evidence.sem &&
            row.aseLiveEvidence?.checkedAt === evidence.checkedAt)) {
        const pair = ensure(evidence.district, evidence.sem);
        pair.accounts.push(first);
        pair.partial = true;
        if (!pair.evidenceCheckedAt || evidence.checkedAt < pair.evidenceCheckedAt) {
          pair.evidenceCheckedAt = evidence.checkedAt;
        }
      }
      continue;
    }
    if (timestamp !== null && monthKey(new Date(timestamp)) === month) {
      ensure(...attribution(first)).accounts.push(first);
    }
  }
  for (const pair of pairs.values()) {
    pair.accounts.sort((a, b) => (a.accountName ?? "").localeCompare(b.accountName ?? ""));
    pair.partial = pair.partial || pair.unknownAccounts > 0;
    pair.actual = pair.partial && pair.accounts.length === 0 ? null : pair.accounts.length;
  }
  return [...pairs.values()].sort((a, b) => a.district.localeCompare(b.district) || a.sem.localeCompare(b.sem));
}

export function belowTarget(pair: MonthlyPair): boolean {
  return pair.target !== null && pair.actual !== null && pair.actual < pair.target;
}
