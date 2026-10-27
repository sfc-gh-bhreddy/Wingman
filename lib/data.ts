import "server-only";
import { mapTmrEvidence, type RawTmrEvidence } from "@/lib/tmr-evidence";
import { LIVE_EVIDENCE_SQL, createEvidenceLoader, type LiveEvidenceRow } from "@/lib/live-evidence";
import { querySnowflake, querySnowflakeLongRunning } from "@/lib/snowflake";
// DT_AGG_WINGMATE pre-filters fiscal year and excluded opps; these imports are
// kept only for reference (not used in the query).
// import { ASE_TMR_SPECIALIST_TYPES, EXCLUDED_OPPORTUNITY_IDS, FISCAL_YEAR } from "@/lib/constants";
import type { CoverageStatus, Deal, UserContext } from "@/lib/types";

// LOCAL DEV BUILD. All Snowflake access goes through lib/snowflake.ts, which
// here uses your default ~/.snowflake connection (set SNOWFLAKE_CONNECTION_NAME
// to pick a specific one). Queries run as YOU, so the row-access policy on the
// bookings view returns the rows your roles can see. This build runs the LIVE
// query (see getDeals), so any signal you add shows up immediately.
// Queries run on this warehouse; set SNOWFLAKE_WAREHOUSE if you don't have
// USAGE on SNOWADHOC.
const WAREHOUSE = process.env.SNOWFLAKE_WAREHOUSE ?? "SNOWADHOC";

/** Fast/light queries (identity lookup, keepalive). */
async function runQuery<T = Record<string, unknown>>(
  sqlText: string,
): Promise<T[]> {
  return (await querySnowflake(sqlText, { warehouse: WAREHOUSE })) as T[];
}

/** Heavy/slow deal query (~50-60s cold): async submit + poll. */
async function runQueryLong<T = Record<string, unknown>>(
  sqlText: string,
): Promise<T[]> {
  return (await querySnowflakeLongRunning(sqlText, { warehouse: WAREHOUSE })) as T[];
}

/**
 * Lightweight keepalive so the pooled owner's-rights connection doesn't
 * idle-drop (which would force a slow reconnect + reauth on the next query).
 */
export async function pingConnection(): Promise<void> {
  try {
    await runQuery("SELECT 1");
  } catch (err) {
    console.error("[keepalive] ping failed:", err);
  }
}

/**
 * Single source-of-truth query: one row per Cap1 deal (opportunity x region x
 * fiscal quarter) for FY27, ALL regions, with account-level ASE coverage
 * evidence, the current-open-quarter flag, the DM sales hierarchy (District /
 * RVP / Owner, carried directly on the bookings view), and the SE Manager
 * (deduped to one per account from RAVEN_SE_ACCOUNT_ASSIGNMENTS). Every page
 * (scorecard, trend, regions, uncovered list, DM rollup, SEM rollup) is derived
 * from these rows client-side.
 *
 * ASE attachment is evaluated at the ACCOUNT level and is any of:
 *   (a) ASE TMR on the account, (b) a '#activation'-tagged use case,
 *   (c) ASE role on a use-case team, (d) ASE role on the account team.
 */
export const DEALS_SQL = `
SELECT *
FROM ACCOUNT_ENGINEERING.PIPELINE.DT_AGG_WINGMATE
ORDER BY CAP1_ACV DESC
`;

/**
 * Data served from DT_AGG_WINGMATE — a dynamic table maintained by the
 * Account Engineering pipeline team. SALES_ENGINEER has SELECT on it,
 * which means SPCS can read it without the FIVETRAN blocker.
 */

interface RawDeal extends RawTmrEvidence {
  OPPORTUNITY_ID: string;
  ACCOUNT_ID: string;
  ACCOUNT_NAME: string | null;
  REGION: string;
  FISCAL_PERIOD: string;
  FQ_NUM: number;
  FISCAL_QUARTER: string;
  IS_OPEN_QUARTER: boolean;
  CLOSE_DATE: string | null;
  CAP1_ACV: number | null;
  HAS_TMR: boolean;
  HAS_ACTIVATION_TAG: boolean;
  HAS_UC_TEAM_ACE: boolean;
  HAS_ACCOUNT_TEAM_ACE: boolean;
  HAS_ANY_ACE: boolean;
  HAS_ACE_BY_CLOSE: boolean;
  DISTRICT: string | null;
  RVP: string | null;
  OWNER: string | null;
  SE_MANAGER: string | null;
  LEAD_SE: string | null;
  ASSIGNED_ACE: string | null;
  ASSIGNED_ACE_EMAIL: string | null;
  YTD_CONSUMPTION: number | null;
  CONSUMPTION_STAGE: string | null;
  IS_NEW_TO_SNOWFLAKE: boolean | null;
  RECOMMENDED_TOPIC_ID: number | null;
  TOPIC_CONFIDENCE: string | null;
  IS_SI_INVOLVED: boolean | null;
  SI_PARTNER_NAME: string | null;
  IS_PARTNER_INVOLVED: boolean | null;
  PARTNER_NAME: string | null;
  IS_PS_INVOLVED: boolean | null;
  PS_ENGAGEMENT: string | null;
  IS_PARTNER_ACCOUNT: boolean | null;
  IS_OD_FLIP: boolean | null;
  FIRST_ACTIVATION_OBSERVED_DATE?: string | null;
  REFRESHED_AT?: Date | string | null;
}

function coverageStatus(anyAce: boolean): CoverageStatus {
  return anyAce ? "ASE assigned" : "No ASE";
}

export async function getDeals(): Promise<Deal[]> {
  const rows = await runQueryLong<RawDeal>(DEALS_SQL);
  return rows.map((r) => {
    const anyAce = Boolean(r.HAS_ANY_ACE);
    const tmr = Boolean(r.HAS_TMR);
    return {
      opportunityId: r.OPPORTUNITY_ID,
      accountId: r.ACCOUNT_ID,
      accountName: r.ACCOUNT_NAME,
      region: r.REGION,
      fiscalPeriod: r.FISCAL_PERIOD,
      fqNum: Number(r.FQ_NUM),
      fiscalQuarter: r.FISCAL_QUARTER,
      isOpenQuarter: Boolean(r.IS_OPEN_QUARTER),
      closeDate: r.CLOSE_DATE,
      cap1Acv: r.CAP1_ACV ?? 0,
      hasTmr: tmr,
      tmrEvidence: mapTmrEvidence(r),
      hasActivationTag: Boolean(r.HAS_ACTIVATION_TAG),
      activationObservedDate: r.FIRST_ACTIVATION_OBSERVED_DATE,
      hasUcTeamAse: Boolean(r.HAS_UC_TEAM_ACE),
      hasAccountTeamAse: Boolean(r.HAS_ACCOUNT_TEAM_ACE),
      hasAnyAse: anyAce,
      // A single observed activation date does not establish complete four-signal history.
      firstAseEvidenceAt: null,
      firstAseEvidenceSource: null,
      firstAseDistrict: null,
      firstAseSem: null,
      aseHistoryComplete: false,
      refreshedAt: r.REFRESHED_AT ? new Date(r.REFRESHED_AT).toISOString() : null,
      hasAseByClose: Boolean(r.HAS_ACE_BY_CLOSE),
      coverageStatus: coverageStatus(anyAce),
      district: r.DISTRICT,
      rvp: r.RVP,
      owner: r.OWNER,
      seManager: r.SE_MANAGER,
      leadSe: r.LEAD_SE,
      assignedAse: r.ASSIGNED_ACE,
      assignedAseEmail: r.ASSIGNED_ACE_EMAIL,
      ytdConsumption: r.YTD_CONSUMPTION ?? 0,
      consumptionStage: (r.CONSUMPTION_STAGE as Deal["consumptionStage"]) ?? "Not Started",
      isNewToSnowflake: Boolean(r.IS_NEW_TO_SNOWFLAKE),
      recommendedTopicId: r.RECOMMENDED_TOPIC_ID ? Number(r.RECOMMENDED_TOPIC_ID) : null,
      topicConfidence: (r.TOPIC_CONFIDENCE as Deal["topicConfidence"]) ?? "inferred",
      isSiInvolved: Boolean(r.IS_SI_INVOLVED),
      siPartnerName: r.SI_PARTNER_NAME,
      isPartnerInvolved: Boolean(r.IS_PARTNER_INVOLVED),
      partnerName: r.PARTNER_NAME,
      isPsInvolved: Boolean(r.IS_PS_INVOLVED),
      psEngagement: r.PS_ENGAGEMENT,
      isPartnerAccount: Boolean(r.IS_PARTNER_ACCOUNT),
      isOdFlip: Boolean(r.IS_OD_FLIP),
    };
  });
}

export const getLiveEvidence = createEvidenceLoader(() => runQueryLong<LiveEvidenceRow>(LIVE_EVIDENCE_SQL));

export const getActivationHistory = createEvidenceLoader(async () => {
  const { existsSync } = await import("node:fs");
  if (existsSync("/snowflake/session/token") || process.env.WINGMATE_LOCAL_ACTIVATION_HISTORY !== "1") {
    throw new Error("Activation history experiment is not enabled.");
  }
  const { ACTIVATION_HISTORY_SQL } = await import("@/lib/activation-history");
  return runQueryLong<import("@/lib/activation-history").ActivationHistoryRow>(ACTIVATION_HISTORY_SQL);
});

function humanizeRole(role: string): string {
  return role
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

let cachedContext: UserContext | null = null;
let contextInFlight: Promise<UserContext> | null = null;

/**
 * Resolves the connected Snowflake user and their humanized role. The app is
 * scoped to the two Commercial Acquisition regions; identity is memoized for the
 * process lifetime (static per session, and the ACCOUNT_USAGE lookup is slow).
 */
export async function getUserContext(): Promise<UserContext> {
  if (cachedContext) return cachedContext;
  if (contextInFlight) return contextInFlight;
  contextInFlight = resolveUserContext().finally(() => {
    contextInFlight = null;
  });
  return contextInFlight;
}

async function resolveUserContext(): Promise<UserContext> {
  let login = "";
  let role = "";
  let displayName: string | null = null;

  try {
    const idRows = await runQuery<{
      LOGIN: string;
      ROLE: string;
      DISPLAY_NAME: string | null;
    }>(
      `SELECT CURRENT_USER() AS login, CURRENT_ROLE() AS role,
              MAX(u.display_name) AS display_name
       FROM SNOWFLAKE.ACCOUNT_USAGE.USERS u
       WHERE u.name = CURRENT_USER() AND u.deleted_on IS NULL`,
    );
    const r = idRows[0];
    login = r?.LOGIN ?? "";
    role = r?.ROLE ?? "";
    displayName = r?.DISPLAY_NAME ?? null;
  } catch {
    const idRows = await runQuery<{ LOGIN: string; ROLE: string }>(
      `SELECT CURRENT_USER() AS login, CURRENT_ROLE() AS role`,
    );
    login = idRows[0]?.LOGIN ?? "";
    role = idRows[0]?.ROLE ?? "";
  }

  cachedContext = {
    login,
    displayName,
    role,
    title: role ? humanizeRole(role) : "",
    regions: ["Comm East", "Comm West"],
    matched: false,
  };
  return cachedContext;
}
