// TEMP diagnostic: per-source row counts for the SPCS service user. Remove once resolved.
import { querySnowflake } from "@/lib/snowflake";

const DIAG_SOURCES = [
  "SALES.RAVEN.SDA_CLOSED_OPPORTUNITY_BOOKINGS_VIEW",
  "SALES.SALES_ENGINEERING.FIELD_SPECIALIST_REQUESTS_DX_ELEMENTUM",
  "SALES.SE_REPORTING.DD_SOLUTION_ENGINEER_SALESFORCE_USE_CASE",
  "SALES.SE_REPORTING.DD_SALESFORCE_USE_CASE_TEAM",
  "FIVETRAN.SALESFORCE.ACCOUNT_TEAM_MEMBER",
  "FIVETRAN.SALESFORCE.OPPORTUNITY",
  "SALES.RAVEN.A360_REVENUE_CONSUMPTION_VIEW",
  "SALES.RAVEN.RAVEN_SE_ACCOUNT_ASSIGNMENTS",
  "SALES.RAVEN.D_SALESFORCE_ACCOUNT_CUSTOMERS",
  "SALES.RAVEN.SDA_DEAL_REGISTRATION_VIEW",
  "ACCOUNT_ENGINEERING.WINGMAN.V_ACE_ACCOUNT_MAP",
  "ACCOUNT_ENGINEERING.WINGMAN.ACE_TOPIC_HINTS",
];

export async function logSourceRowCounts() {
    try {
    const [who] = await querySnowflake(
      "SELECT CURRENT_USER() AS U, CURRENT_ROLE() AS R, CURRENT_SECONDARY_ROLES() AS S"
    );
    console.log(`[diag] user=${who?.U} role=${who?.R} secondary=${who?.S}`);
  } catch (e) {
    console.log(`[diag] identity check failed: ${(e as Error).message}`);
  }
  for (const t of DIAG_SOURCES) {
    try {
      const [r] = await querySnowflake(`SELECT COUNT(*) AS N FROM ${t}`);
      console.log(`[diag] ${t} rows=${r?.N}`);
    } catch (e) {
      console.log(`[diag] ${t} ERROR ${(e as Error).message}`);
    }
  }
}
