import type { Deal } from "./types";
import { FISCAL_YEAR, FOCUS_REGIONS } from "./constants.ts";
import { isCalendarDate, isZonedTimestamp } from "./tmr-evidence.ts";

export type TmrPeriodMode = "month" | "quarter";
export const TMR_EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MONTHLY_GOAL = 12;
const TIMEZONE = "America/New_York";

export interface TmrPeriod {
  label: string;
  start: string;
  endExclusive: string;
  through: string;
  target: number;
  targetLabel: string;
  available: boolean;
}

function dateOnly(date: Date): string { return date.toISOString().slice(0, 10); }
function monthStart(year: number, monthIndex: number): string { return dateOnly(new Date(Date.UTC(year, monthIndex, 1))); }
function previousDay(date: string): string { return dateOnly(new Date(Date.parse(date) - 86_400_000)); }
function easternDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function tmrPeriod(now: Date, mode: TmrPeriodMode, quarter: number | "ALL", fiscalYear = FISCAL_YEAR): TmrPeriod {
  const today = easternDate(now);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const fyStart = monthStart(fiscalYear - 1, 1);
  const fyEnd = monthStart(fiscalYear, 1);
  let start: string;
  let endExclusive: string;
  let label: string;
  let target: number;
  let targetLabel: string;
  if (mode === "month") {
    start = monthStart(year, month - 1);
    endExclusive = monthStart(year, month);
    label = new Intl.DateTimeFormat("en-US", {timeZone: TIMEZONE, month: "long", year: "numeric"}).format(now);
    target = MONTHLY_GOAL;
    targetLabel = "12 accounts / month";
  } else if (quarter === "ALL") {
    start = fyStart;
    endExclusive = fyEnd;
    label = `FY${String(fiscalYear).slice(-2)}${today < fyEnd ? " to date" : " full year"}`;
    const months = Math.max(0, Math.min(12, (year - (fiscalYear - 1)) * 12 + month - 1));
    target = MONTHLY_GOAL * months;
    targetLabel = `${target} accounts / ${months} fiscal months started`;
  } else {
    if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) throw new Error("Invalid fiscal quarter");
    start = monthStart(fiscalYear - 1, 1 + (quarter - 1) * 3);
    endExclusive = monthStart(fiscalYear - 1, 1 + quarter * 3);
    label = `FY${String(fiscalYear).slice(-2)} Q${quarter}${today >= start && today < endExclusive ? " to date" : ""}`;
    target = MONTHLY_GOAL * 3;
    targetLabel = "36 accounts / full quarter";
  }
  return {label, start, endExclusive, through: today < endExclusive ? today : previousDay(endExclusive), target, targetLabel,
    available: today >= start && start >= fyStart && start < fyEnd && target > 0};
}

export interface DistrictTmrRank {
  district: string;
  rank: number;
  additions: number;
  score: number;
}
export interface TmrLeaderboardResult {
  status: "ready" | "empty" | "unavailable";
  period: TmrPeriod;
  rows: DistrictTmrRank[];
  reason: string | null;
  excludedAccounts: number;
  unavailableAccounts: number;
  checkedAt: string | null;
  tiedCutoff: boolean;
}

function compareOwnership(left: Deal, right: Deal): number {
  return (right.closeDate ?? "").localeCompare(left.closeDate ?? "") ||
    left.opportunityId.localeCompare(right.opportunityId) || left.fqNum - right.fqNum ||
    (left.district ?? "").localeCompare(right.district ?? "") || left.region.localeCompare(right.region);
}

export function districtTmrLeaderboard(deals: Deal[], now: Date, mode: TmrPeriodMode, quarter: number | "ALL", region = "FOCUS"): TmrLeaderboardResult {
  const period = tmrPeriod(now, mode, quarter);
  const result: TmrLeaderboardResult = {status: "unavailable", period, rows: [], reason: null, excludedAccounts: 0, unavailableAccounts: 0, checkedAt: null, tiedCutoff: false};
  if (!period.available) return {...result, reason: "This period is outside the elapsed FY27 roster scope."};
  const inRegion = (value: string) => region === "ALL" || region === "FOCUS" ? FOCUS_REGIONS.includes(value) : value === region;
  const accounts = new Map<string, Deal[]>();
  for (const deal of deals) {
    if (!deal.accountId?.trim()) {
      if (inRegion(deal.region)) return {...result, reason: "An account identifier is missing. Rankings are unavailable until the roster is corrected."};
      continue;
    }
    const rows = accounts.get(deal.accountId) ?? [];
    rows.push(deal);
    accounts.set(deal.accountId, rows);
  }
  const counts = new Map<string, number>();
  let hasStale = false;
  for (const rows of accounts.values()) {
    const owner = [...rows].sort(compareOwnership)[0];
    if (!inRegion(owner.region)) continue;
    if (!owner.district?.trim() || owner.district === "(No district)") { result.excludedAccounts++; continue; }
    counts.set(owner.district, counts.get(owner.district) ?? 0);
    const evidence = owner.tmrEvidence;
    const valid = evidence && evidence.complete === true &&
      isCalendarDate(evidence.coveredFrom) && isCalendarDate(evidence.coveredThrough) &&
      evidence.coveredFrom <= period.start && evidence.coveredThrough >= period.through &&
      isZonedTimestamp(evidence.checkedAt) && Date.parse(evidence.checkedAt) <= now.getTime() &&
      Array.isArray(evidence.dates) && evidence.dates.every(date => isCalendarDate(date) && date >= evidence.coveredFrom && date <= evidence.coveredThrough && date <= easternDate(new Date(evidence.checkedAt))) &&
      rows.every(row => JSON.stringify(row.tmrEvidence) === JSON.stringify(evidence));
    const stale = evidence && isZonedTimestamp(evidence.checkedAt) && now.getTime() - Date.parse(evidence.checkedAt) > TMR_EVIDENCE_MAX_AGE_MS;
    if (!valid || stale) {
      result.unavailableAccounts++;
      hasStale ||= Boolean(stale);
      continue;
    }
    if (!result.checkedAt || Date.parse(evidence.checkedAt) < Date.parse(result.checkedAt)) result.checkedAt = evidence.checkedAt;
    if (evidence.dates.some(date => date >= period.start && date <= period.through && date < period.endExclusive)) {
      counts.set(owner.district, counts.get(owner.district)! + 1);
    }
  }
  if (result.unavailableAccounts) return {...result, reason: hasStale
    ? "TMR evidence is older than 24 hours. Rankings are paused until it refreshes."
    : "Awaiting TMR dates: complete dated evidence is not available for every account in this scope."};
  const ranked = [...counts.entries()].filter(([, count]) => count > 0)
    .sort(([left, leftCount], [right, rightCount]) => rightCount - leftCount || left.localeCompare(right));
  let rank = 0;
  const allRows = ranked.map(([district, additions], index) => {
    if (index === 0 || additions !== ranked[index - 1][1]) rank = index + 1;
    return {district, additions, rank, score: additions / period.target * 100};
  });
  return {...result, status: allRows.length ? "ready" : "empty", rows: allRows.slice(0, 3),
    tiedCutoff: allRows.length > 3 && allRows[2].additions === allRows[3].additions,
    reason: counts.size === 0 ? "No mapped district accounts in this scope." : allRows.length === 0 ? "No new qualifying TMR accounts in this period." : null};
}
