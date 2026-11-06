/**
 * Shared (client + server) types for manual AE/SE status overrides on the
 * ASE Coverage AE/SE drill-down.
 *
 * - NOT_FIT / PS / SI: a "No ASE" account is moved to the potential-involvement table.
 * - NO_ASE: an account with automatic signals is moved back to the main table as No ASE.
 */
export const ACCOUNT_MARKS = ["NOT_FIT", "PS", "SI", "NO_ASE"] as const;
export type AccountMark = (typeof ACCOUNT_MARKS)[number];

export const MARK_LABELS: Record<AccountMark, string> = {
  NOT_FIT: "Not a good fit",
  PS: "PS involved",
  SI: "SI involved",
  NO_ASE: "No ASE",
};

export interface AccountReview {
  accountId: string;
  mark: AccountMark;
  note?: string;
  updatedBy: string;
  updatedAt: string;
}

/** mark null clears the override and restores the automatic placement. */
export interface AccountReviewChange {
  accountId: string;
  mark: AccountMark | null;
  note?: string;
}

/** True when the mark moves the account into the potential-involvement table. */
export function marksAsInvolved(mark: AccountMark | null | undefined): boolean {
  return mark === "NOT_FIT" || mark === "PS" || mark === "SI";
}
