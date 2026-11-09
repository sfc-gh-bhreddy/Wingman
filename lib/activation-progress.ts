import type { Deal } from "./types";
import { monthKey, MONTHLY_TARGET, NO_DISTRICT, NO_SEM, type MonthlyPair } from "./monthly-progress.ts";
import { tmrPeriod, type TmrLeaderboardResult } from "./tmr-leaderboard.ts";

/** Rank the same observed account additions used by Attachment Goals. */
export function observedActivationLeaderboard(deals: Deal[], now: Date): TmrLeaderboardResult {
  const pairs = activationProgress(deals, now).filter(pair => pair.target !== null);
  const period = tmrPeriod(now, "month", "ALL");
  const unavailable = pairs.some(pair => pair.actual === null);
  const ranked = pairs.filter(pair => (pair.actual ?? 0) > 0)
    .sort((left, right) => right.actual! - left.actual! || left.district.localeCompare(right.district));
  let rank = 0;
  const rows = ranked.map((pair, index) => {
    if (index === 0 || pair.actual !== ranked[index - 1].actual) rank = index + 1;
    return {district: pair.district, additions: pair.actual!, rank, score: pair.actual! / MONTHLY_TARGET * 100};
  });
  const timestamps = pairs.map(pair => pair.evidenceCheckedAt).filter((value): value is string => Boolean(value)).sort();
  return {
    period, status: unavailable || !period.available ? "unavailable" : rows.length ? "ready" : "empty",
    rows: unavailable || !period.available ? [] : rows.slice(0, 3),
    reason: unavailable ? "Waiting for recorded activation dates." : !period.available ? "Outside the FY27 roster period." : rows.length ? null : "No supported activation additions observed this month.",
    excludedAccounts: 0, unavailableAccounts: pairs.reduce((sum, pair) => sum + pair.unknownAccounts, 0),
    checkedAt: timestamps[0] ?? null,
    tiedCutoff: rows.length > 3 && rows[2].additions === rows[3].additions,
  };
}

/** Display-only names from the roster; missing mappings never remove accounts. */
export function districtSemNames(deals: Deal[], district: string): string[] {
  return [...new Set(deals
    .filter(deal => deal.district === district)
    .map(deal => deal.seManager?.trim())
    .filter((name): name is string => Boolean(name) && name !== NO_SEM))]
    .sort((left, right) => left.localeCompare(right));
}

function validDate(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
}

/** Carryover tracking starts with the first FY27 goal month. */
export const BACKLOG_START_MONTH = "2026-10";

export type BacklogMonth = {month: string; goal: number; added: number; owed: number};
export type DistrictBacklog = {status: "ready" | "none" | "unavailable"; total: number | null; months: BacklogMonth[]};

function nextMonth(month: string): string {
  const [year, value] = month.split("-").map(Number);
  return value === 12 ? `${year + 1}-01` : `${year}-${String(value + 1).padStart(2, "0")}`;
}

/** Completed months only: each month's goal is 12 plus the shortfall carried in. */
export function districtBacklog(deals: Deal[], now: Date, district: string): DistrictBacklog {
  const current = monthKey(now);
  const months: BacklogMonth[] = [];
  let carry = 0;
  for (let month = BACKLOG_START_MONTH; month < current; month = nextMonth(month)) {
    const pair = activationProgress(deals, now, false, month).find(item => item.district === district);
    if (!pair || pair.actual === null) return {status: "unavailable", total: null, months};
    const goal = MONTHLY_TARGET + carry;
    carry = Math.max(0, goal - pair.actual);
    months.push({month, goal, added: pair.actual, owed: carry});
  }
  return {status: months.length ? "ready" : "none", total: carry, months};
}

export function activationProgress(deals: Deal[], now: Date, bySem = false, month = monthKey(now)): MonthlyPair[] {
  const groups = new Map<string, MonthlyPair>();
  const accounts = new Map<string, Deal[]>();
  const ensure = (district: string, sem: string) => {
    const key = JSON.stringify([district, sem]);
    if (!groups.has(key)) groups.set(key, {key, district, sem, month,
      target: !bySem && district !== NO_DISTRICT ? MONTHLY_TARGET : null,
      actual: null, unknownAccounts: 0, accounts: [], partial: true, evidenceCheckedAt: null});
    return groups.get(key)!;
  };
  for (const deal of deals) {
    ensure(deal.district ?? NO_DISTRICT, bySem ? deal.seManager ?? NO_SEM : "All SEMs");
    const rows = accounts.get(deal.accountId) ?? [];
    rows.push(deal);
    accounts.set(deal.accountId, rows);
  }
  for (const [accountId, rows] of accounts) {
    const first = rows[0];
    // Prefer the aggregate column without inventing transition metadata or dates.
    if (rows.some(row => row.activationObservedDate !== undefined)) {
      const group = ensure(first.district ?? NO_DISTRICT, bySem ? first.seManager ?? NO_SEM : "All SEMs");
      const checkedAt = first.refreshedAt;
      if (!accountId || !checkedAt || !Number.isFinite(Date.parse(checkedAt)) || Date.parse(checkedAt) > now.getTime() ||
          !rows.every(row => row.activationObservedDate === first.activationObservedDate && row.district === first.district && (!bySem || row.seManager === first.seManager))) {
        group.unknownAccounts++;
        continue;
      }
      group.actual ??= 0;
      if (!group.evidenceCheckedAt || checkedAt < group.evidenceCheckedAt) group.evidenceCheckedAt = checkedAt;
      const date = first.activationObservedDate;
      if (!validDate(date) || date > checkedAt.slice(0, 10)) {
        group.unknownAccounts++;
        continue;
      }
      if (date.slice(0, 7) === month) group.accounts.push(first);
      continue;
    }
    const history = first.activationHistory;
    const group = ensure(history?.district ?? first.district ?? NO_DISTRICT,
      bySem ? history?.sem ?? first.seManager ?? NO_SEM : "All SEMs");
    if (!accountId || !history || !Number.isFinite(Date.parse(history.checkedAt)) ||
        Date.parse(history.checkedAt) > now.getTime() ||
        !rows.every(row => JSON.stringify(row.activationHistory) === JSON.stringify(history))) {
      group.unknownAccounts++;
      continue;
    }
    group.actual ??= 0;
    if (!group.evidenceCheckedAt || history.checkedAt < group.evidenceCheckedAt) group.evidenceCheckedAt = history.checkedAt;
    if (history.status === "BASELINE_TAGGED" || history.status === "NO_HISTORY" ||
        (history.status === "NO_OBSERVED_ACTIVATION" && rows.some(row => row.hasActivationTag))) {
      group.unknownAccounts++;
      continue;
    }
    if (history.status !== "OBSERVED_TRANSITION") continue;
    if (!validDate(history.firstObservedDate) || !validDate(history.previousObservedDate) ||
        history.previousObservedDate > history.firstObservedDate ||
        history.firstObservedDate > history.checkedAt.slice(0, 10)) {
      group.unknownAccounts++;
      continue;
    }
    if (history.firstObservedDate.slice(0, 7) === month) group.accounts.push(first);
  }
  for (const group of groups.values()) {
    group.accounts.sort((left, right) => (left.accountName ?? "").localeCompare(right.accountName ?? ""));
    if (group.actual !== null) group.actual = group.accounts.length;
  }
  return [...groups.values()].sort((left, right) => left.district.localeCompare(right.district) || left.sem.localeCompare(right.sem));
}
