/** Coverage classification for a single Cap1 deal. */
export type CoverageStatus = "ASE assigned" | "No ASE";

/**
 * One Cap1 deal (one row per opportunity x region x fiscal quarter) with its
 * account-level ASE coverage evidence and the sales / SE hierarchy needed for
 * the DM and SEM rollups. This is the single dataset every view derives from.
 */
export interface Deal {
  opportunityId: string;
  accountId: string;
  accountName: string | null;
  /** Raw region code, e.g. "CommAcqEast". Map to a label in the UI layer. */
  region: string;
  /** e.g. "FY27 Q2". */
  fiscalPeriod: string;
  /** 1..4 fiscal-quarter number (trend ordering). */
  fqNum: number;
  /** e.g. "Q2". */
  fiscalQuarter: string;
  /** True when this row's quarter is the current, still-open fiscal quarter. */
  isOpenQuarter: boolean;
  closeDate: string | null;
  cap1Acv: number;
  hasTmr: boolean;
  /** Optional dated request evidence; independent of activation-tag history. */
  tmrEvidence?: import("./tmr-evidence").TmrEvidence | null;
  hasActivationTag: boolean;
  /** Upstream observed date; null is unknown, undefined means the column is absent. */
  activationObservedDate?: string | null;
  hasUcTeamAse: boolean;
  hasAccountTeamAse: boolean;
  hasAnyAse: boolean;
  /** Proposed upstream history contract; unavailable until supplied and verified. */
  firstAseEvidenceAt?: string | null;
  firstAseEvidenceSource?: string | null;
  firstAseDistrict?: string | null;
  firstAseSem?: string | null;
  aseHistoryComplete?: boolean;
  /** Query freshness is independent of aggregate refresh and historical completeness. */
  aseEvidenceCheckedAt?: string | null;
  /** Live first-known dated evidence, not complete four-signal history. */
  aseLiveEvidence?: {
    date: string;
    source: string;
    district: string;
    sem: string;
    checkedAt: string;
  };
  activationHistory?: {
    firstObservedDate: string | null;
    previousObservedDate: string | null;
    useCaseNumber: string | null;
    status: "OBSERVED_TRANSITION" | "BASELINE_TAGGED" | "NO_HISTORY" | "NO_OBSERVED_ACTIVATION";
    district: string | null;
    sem: string | null;
    checkedAt: string;
  };
  refreshedAt?: string | null;
  /** First timestamped ASE evidence on/before the close date (pre-close signal). */
  hasAseByClose: boolean;
  coverageStatus: CoverageStatus;
  /** DM's book (District). */
  district: string | null;
  /** Regional VP (level above district). */
  rvp: string | null;
  /** AE / opportunity owner. */
  owner: string | null;
  /** SE Manager (deduped to one per account); null => "(No SE manager)". */
  seManager: string | null;
  /** Lead SE on the account (from D_SALESFORCE_ACCOUNT_CUSTOMERS). */
  leadSe: string | null;
  /** ASE attached to the account via Salesforce use case team. */
  assignedAse: string | null;
  assignedAseEmail: string | null;
  /** Fiscal year-to-date consumption revenue for the account (USD). */
  ytdConsumption: number;
  consumptionStage: "Not Started" | "Started Slow" | "Ramping" | "Mature";
  isNewToSnowflake: boolean;
  recommendedTopicId: number | null;
  topicConfidence: "detected" | "inferred";
  /** True when every open (not deployed) use case has an SI partner — fully handled. */
  isSiInvolved: boolean;
  /** SI firm name when known from the use-case record; null otherwise. */
  siPartnerName: string | null;
  /** True when ANY use case (open or not) carries a partner name. */
  isPartnerInvolved: boolean;
  /** Partner name from any use case; null otherwise. */
  partnerName: string | null;
  /** True when any use case has PS engagement (Advisory/Proposing/Implementation/Support). */
  isPsInvolved: boolean;
  /** Latest PS engagement stage when flagged; null otherwise. */
  psEngagement: string | null;
  /** True when the account itself is a partner (TYPE='Partner', DCP/DCS flags). */
  isPartnerAccount: boolean;
  /** True when the account has both Closed Won On Demand and Capacity opportunities. */
  isOdFlip: boolean;
}

export interface UserContext {
  /** Snowflake login name (CURRENT_USER). */
  login: string;
  /** Human display name from ACCOUNT_USAGE.USERS, if resolvable. */
  displayName: string | null;
  /** CURRENT_ROLE. */
  role: string;
  /** Humanized role used as the greeting title (e.g. "Sales Engineer"). */
  title: string;
  /** Region labels this app is scoped to. */
  regions: string[];
  /** True if the user was matched into the sales hierarchy; false = app scope. */
  matched: boolean;
}
