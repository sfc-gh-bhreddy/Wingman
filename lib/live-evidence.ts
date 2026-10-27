import type { Deal } from "./types";

// The roster stays on the approved aggregate. Evidence is recomputed across
// all available dates before selecting the first known event per account.
export const LIVE_EVIDENCE_SQL = `
WITH evidence AS (
  SELECT ACCOUNT_ID, REQUEST_CREATED_DATE::DATE AS EVIDENCE_DATE,
    'TMR created' AS SOURCE
  FROM SALES.SALES_ENGINEERING.FIELD_SPECIALIST_REQUESTS_DX_ELEMENTUM
  WHERE SPECIALIST_TYPE IN ('Account Engineer', 'Activation SE - AMS Acq ONLY')
  UNION ALL
  SELECT SALESFORCE_ACCOUNT_ID, SALESFORCE_USE_CASE_TEAM_CREATED_AT::DATE,
    'Use-case ASE team added'
  FROM SALES.SE_REPORTING.DD_SALESFORCE_USE_CASE_TEAM
  WHERE SALESFORCE_USE_CASE_TEAM_ROLE IN ('SE - Account Engineer', 'SE - Activation')
    AND IS_SALESFORCE_USE_CASE_TEAM_SALESFORCE_DELETED = FALSE
  UNION ALL
  SELECT ACCOUNT_ID, CREATED_DATE::DATE, 'Account ASE team added'
  FROM FIVETRAN.SALESFORCE.ACCOUNT_TEAM_MEMBER
  WHERE TEAM_MEMBER_ROLE IN ('SE - Account Engineer', 'SE - Activation')
    AND IS_DELETED = FALSE AND _FIVETRAN_DELETED = FALSE
), first_known AS (
  SELECT ACCOUNT_ID, EVIDENCE_DATE, SOURCE
  FROM evidence WHERE EVIDENCE_DATE IS NOT NULL
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ACCOUNT_ID ORDER BY EVIDENCE_DATE, SOURCE) = 1
), roster AS (
  SELECT ACCOUNT_ID, DISTRICT, SE_MANAGER
  FROM ACCOUNT_ENGINEERING.PIPELINE.DT_AGG_WINGMATE
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ACCOUNT_ID ORDER BY CLOSE_DATE DESC, OPPORTUNITY_ID) = 1
)
SELECT roster.ACCOUNT_ID, roster.DISTRICT, roster.SE_MANAGER,
  TO_CHAR(first_known.EVIDENCE_DATE, 'YYYY-MM-DD') AS EVIDENCE_DATE,
  first_known.SOURCE,
  TO_CHAR(CONVERT_TIMEZONE('UTC', CURRENT_TIMESTAMP()), 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"') AS CHECKED_AT
FROM roster LEFT JOIN first_known ON roster.ACCOUNT_ID = first_known.ACCOUNT_ID
`;

export interface LiveEvidenceRow {
  ACCOUNT_ID: string;
  DISTRICT: string | null;
  SE_MANAGER: string | null;
  EVIDENCE_DATE: string | null;
  SOURCE: string | null;
  CHECKED_AT: string;
}

export function attachLiveEvidence(deals: Deal[], evidence: LiveEvidenceRow[]): Deal[] {
  const byAccount = new Map(evidence.map(row => [row.ACCOUNT_ID, row]));
  return deals.map(deal => {
    const row = byAccount.get(deal.accountId);
    return {
      ...deal,
      aseEvidenceCheckedAt: row?.CHECKED_AT ?? null,
      aseLiveEvidence: row?.EVIDENCE_DATE && row.SOURCE ? {
        date: row.EVIDENCE_DATE,
        source: row.SOURCE,
        district: row.DISTRICT ?? "(No district)",
        sem: row.SE_MANAGER ?? "(No SE manager)",
        checkedAt: row.CHECKED_AT,
      } : undefined,
    };
  });
}

/** Fresh-only memory cache: failed refreshes propagate, never masquerade as live data. */
export function createEvidenceLoader<Row = LiveEvidenceRow>(
  query: () => Promise<Row[]>,
  clock: () => number = Date.now,
  ttlMs = 60_000,
): () => Promise<Row[]> {
  let cached: Row[] | null = null;
  let expiresAt = 0;
  let inFlight: Promise<Row[]> | null = null;
  return () => {
    if (cached !== null && clock() < expiresAt) return Promise.resolve(cached);
    if (inFlight) return inFlight;
    inFlight = query().then(rows => {
      cached = rows;
      expiresAt = clock() + ttlMs;
      return rows;
    }).finally(() => { inFlight = null; });
    return inFlight;
  };
}
