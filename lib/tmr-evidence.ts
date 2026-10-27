export interface TmrEvidence {
  dates: string[];
  coveredFrom: string;
  coveredThrough: string;
  checkedAt: string;
  complete: boolean;
}

/** Proposed optional columns on DT_AGG_WINGMATE; absent columns mean unavailable. */
export interface RawTmrEvidence {
  ASE_TMR_CREATED_DATES?: unknown;
  ASE_TMR_HISTORY_FROM?: unknown;
  ASE_TMR_HISTORY_THROUGH?: unknown;
  ASE_TMR_HISTORY_COMPLETE?: unknown;
  ASE_TMR_HISTORY_CHECKED_AT?: unknown;
}

export function isCalendarDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function isZonedTimestamp(value: unknown): value is string {
  return typeof value === "string" && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}

/** Fail closed per account without throwing away the main coverage roster. */
export function mapTmrEvidence(row: RawTmrEvidence): TmrEvidence | null {
  let dates = row.ASE_TMR_CREATED_DATES;
  if (typeof dates === "string") {
    try { dates = JSON.parse(dates); } catch { return null; }
  }
  const from = row.ASE_TMR_HISTORY_FROM;
  const through = row.ASE_TMR_HISTORY_THROUGH;
  const checked = row.ASE_TMR_HISTORY_CHECKED_AT;
  const checkedAt = checked instanceof Date && Number.isFinite(checked.getTime()) ? checked.toISOString() : checked;
  if (!Array.isArray(dates) || !dates.every(isCalendarDate) ||
      !isCalendarDate(from) || !isCalendarDate(through) || from > through ||
      !isZonedTimestamp(checkedAt) || typeof row.ASE_TMR_HISTORY_COMPLETE !== "boolean" ||
      dates.some(date => date < from || date > through)) return null;
  return {
    dates: [...new Set(dates as string[])].sort(), coveredFrom: from, coveredThrough: through,
    checkedAt, complete: row.ASE_TMR_HISTORY_COMPLETE,
  };
}
