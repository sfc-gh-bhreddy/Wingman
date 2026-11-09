import "server-only";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { querySnowflake } from "@/lib/snowflake";
import {
  ACCOUNT_MARKS,
  type AccountMark,
  type AccountReview,
  type AccountReviewChange,
} from "@/lib/account-review-types";

/**
 * Manual AE/SE status overrides for the ASE Coverage drill-down, stored per account.
 *
 * - SPCS (or REVIEW_STORE=snowflake): ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_ACCOUNT_REVIEW + _HISTORY.
 *   The container filesystem isn't persistent, so the shared link must use Snowflake.
 *   These live in ACCOUNT_ENGINEERING (not TEMP, which is shared and can be wiped).
 * - Local dev default: a JSON file under .data-cache/ (gitignored, excluded from the image).
 */

const TABLE = "ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_ACCOUNT_REVIEW";
const HISTORY_TABLE = "ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_ACCOUNT_REVIEW_HISTORY";

const DIR = join(process.cwd(), ".data-cache");
const FILE = join(DIR, "account-reviews.json");
const HISTORY_FILE = join(DIR, "account-reviews-history.jsonl");

const ACCOUNT_ID_RE = /^001[A-Za-z0-9]{12,15}$/;
const MAX_NOTE = 500;
const MAX_CHANGES = 200;

export class ReviewInputError extends Error {}

function useSnowflake(): boolean {
  const pick = process.env.REVIEW_STORE?.toLowerCase();
  if (pick === "snowflake") return true;
  if (pick === "file") return false;
  return existsSync("/snowflake/session/token");
}

/** Validates untrusted POST input; throws ReviewInputError with a user-facing message. */
export function validateChanges(input: unknown): AccountReviewChange[] {
  const changes = (input as { changes?: unknown })?.changes;
  if (!Array.isArray(changes) || changes.length === 0) throw new ReviewInputError("No changes to save.");
  if (changes.length > MAX_CHANGES) throw new ReviewInputError(`Save at most ${MAX_CHANGES} changes at once.`);
  return changes.map((raw) => {
    const c = raw as Record<string, unknown>;
    const accountId = typeof c.accountId === "string" ? c.accountId.trim() : "";
    if (!ACCOUNT_ID_RE.test(accountId)) throw new ReviewInputError("Invalid account ID.");
    if (c.mark === null) return { accountId, mark: null };
    if (typeof c.mark !== "string" || !(ACCOUNT_MARKS as readonly string[]).includes(c.mark)) {
      throw new ReviewInputError("Invalid status.");
    }
    const note = typeof c.note === "string" ? c.note.trim() : "";
    if (note.length > MAX_NOTE) throw new ReviewInputError(`Notes must be ${MAX_NOTE} characters or fewer.`);
    return { accountId, mark: c.mark as AccountMark, note: note || undefined };
  });
}

export async function listReviews(): Promise<AccountReview[]> {
  return useSnowflake() ? listFromSnowflake() : Object.values(readFile());
}

/** Applies changes (mark null = clear the override) and returns the full list. */
export async function saveReviews(changes: AccountReviewChange[], updatedBy: string): Promise<AccountReview[]> {
  if (useSnowflake()) {
    await saveToSnowflake(changes, updatedBy);
    return listFromSnowflake();
  }
  return saveToFile(changes, updatedBy);
}

// --- Snowflake store ---

async function listFromSnowflake(): Promise<AccountReview[]> {
  const rows = await querySnowflake(
    `SELECT ACCOUNT_ID, MARK, NOTE, UPDATED_BY, TO_VARCHAR(UPDATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') AS UPDATED_AT FROM ${TABLE}`,
  );
  return rows.map((r) => ({
    accountId: String(r.ACCOUNT_ID),
    mark: r.MARK as AccountMark,
    note: r.NOTE ?? undefined,
    updatedBy: String(r.UPDATED_BY),
    updatedAt: String(r.UPDATED_AT),
  }));
}

async function saveToSnowflake(changes: AccountReviewChange[], updatedBy: string) {
  // All user input goes through binds; table names are constants.
  for (const c of changes) {
    if (c.mark === null) {
      await querySnowflake(`DELETE FROM ${TABLE} WHERE ACCOUNT_ID = ?`, { binds: [c.accountId] });
    } else {
      await querySnowflake(
        `MERGE INTO ${TABLE} t
         USING (SELECT ? AS ACCOUNT_ID, ? AS MARK, ? AS NOTE, ? AS UPDATED_BY) s
         ON t.ACCOUNT_ID = s.ACCOUNT_ID
         WHEN MATCHED THEN UPDATE SET MARK = s.MARK, NOTE = s.NOTE, UPDATED_BY = s.UPDATED_BY, UPDATED_AT = CURRENT_TIMESTAMP()
         WHEN NOT MATCHED THEN INSERT (ACCOUNT_ID, MARK, NOTE, UPDATED_BY, UPDATED_AT)
           VALUES (s.ACCOUNT_ID, s.MARK, s.NOTE, s.UPDATED_BY, CURRENT_TIMESTAMP())`,
        { binds: [c.accountId, c.mark, c.note ?? null, updatedBy] },
      );
    }
    await querySnowflake(
      `INSERT INTO ${HISTORY_TABLE} (ACCOUNT_ID, MARK, NOTE, UPDATED_BY, UPDATED_AT) SELECT ?, ?, ?, ?, CURRENT_TIMESTAMP()`,
      { binds: [c.accountId, c.mark, c.note ?? null, updatedBy] },
    );
  }
}

// --- Local file store ---

function readFile(): Record<string, AccountReview> {
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveToFile(changes: AccountReviewChange[], updatedBy: string): AccountReview[] {
  const all = readFile();
  const updatedAt = new Date().toISOString();
  const history: string[] = [];
  for (const c of changes) {
    if (c.mark === null) delete all[c.accountId];
    else all[c.accountId] = { accountId: c.accountId, mark: c.mark, note: c.note, updatedBy, updatedAt };
    history.push(JSON.stringify({ ...c, updatedBy, updatedAt }));
  }
  mkdirSync(DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(all, null, 2));
  renameSync(tmp, FILE);
  appendFileSync(HISTORY_FILE, history.join("\n") + "\n");
  return Object.values(all);
}
