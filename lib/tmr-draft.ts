/** AI-drafted TMR fields from DT_AGG_WINGMATE. Users must review before submitting. */
export interface TmrDraft {
  status: "DRAFTED" | "LOW_EVIDENCE" | string;
  requestReason: string | null;
  targetOutcome: string | null;
  partnerStatus: string | null;
  partnerNames: string | null;
  partnerConflict: boolean;
  opportunityId: string | null;
  meetingsRead: number | null;
  generatedAt: string | null;
}

export interface RawTmrDraft {
  TMR_DRAFT_STATUS?: string | null;
  TMR_DRAFT_REQUEST_REASON?: string | null;
  TMR_DRAFT_TARGET_SUCCESS_OUTCOME?: string | null;
  TMR_DRAFT_PARTNER_STATUS?: string | null;
  TMR_DRAFT_PARTNER_NAMES?: string | null;
  TMR_DRAFT_PARTNER_CONFLICT?: boolean | null;
  TMR_DRAFT_OPPORTUNITY_ID?: string | null;
  TMR_DRAFT_MEETINGS_READ?: number | null;
  TMR_DRAFT_GENERATED_AT?: Date | string | null;
}

const text = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** Null when the pipeline produced no draft for this deal. */
export function mapTmrDraft(r: RawTmrDraft): TmrDraft | null {
  const status = text(r.TMR_DRAFT_STATUS);
  if (!status) return null;
  const generated = r.TMR_DRAFT_GENERATED_AT ? new Date(r.TMR_DRAFT_GENERATED_AT) : null;
  return {
    status,
    requestReason: text(r.TMR_DRAFT_REQUEST_REASON),
    targetOutcome: text(r.TMR_DRAFT_TARGET_SUCCESS_OUTCOME),
    partnerStatus: text(r.TMR_DRAFT_PARTNER_STATUS),
    partnerNames: text(r.TMR_DRAFT_PARTNER_NAMES),
    partnerConflict: Boolean(r.TMR_DRAFT_PARTNER_CONFLICT),
    opportunityId: text(r.TMR_DRAFT_OPPORTUNITY_ID),
    meetingsRead: r.TMR_DRAFT_MEETINGS_READ == null ? null : Number(r.TMR_DRAFT_MEETINGS_READ),
    generatedAt: generated && !Number.isNaN(generated.getTime()) ? generated.toISOString() : null,
  };
}

/** A draft is usable only when the pipeline drafted it and at least one text field is present. */
export function isDraftReady(d: TmrDraft | null | undefined): boolean {
  return Boolean(d && d.status === "DRAFTED" && (d.requestReason || d.targetOutcome));
}

/** Browser-only edits; never written back to Snowflake or Salesforce. */
export interface TmrDraftEdits {
  text: string;
}

/** One copy-paste block for the TMR: reason, outcome, partner, opportunity — no section headings. */
export function combinedDraftText(d: TmrDraft | null | undefined): string {
  if (!d) return "";
  const partner = d.partnerStatus || d.partnerNames
    ? `Partner: ${[d.partnerStatus, d.partnerNames].filter(Boolean).join(" - ")}`
    : null;
  const tail = [partner, d.opportunityId ? `Opportunity: ${d.opportunityId}` : null].filter(Boolean).join("\n");
  return [d.requestReason, d.targetOutcome, tail].filter((p) => p && p.trim()).join("\n\n");
}

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const editKey = (opportunityId: string) => `wingman-tmr-draft-edit:${opportunityId}`;

export function loadEdits(store: KeyValueStore, opportunityId: string): TmrDraftEdits | null {
  try {
    const raw = store.getItem(editKey(opportunityId));
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.text === "string") return { text: v.text };
    // Edits saved before the single-block layout.
    if (typeof v?.requestReason !== "string" || typeof v?.targetOutcome !== "string") return null;
    return { text: [v.requestReason, v.targetOutcome].filter((p: string) => p.trim()).join("\n\n") };
  } catch {
    return null;
  }
}

export function saveEdits(store: KeyValueStore, opportunityId: string, edits: TmrDraftEdits): void {
  store.setItem(editKey(opportunityId), JSON.stringify(edits));
}

export function resetEdits(store: KeyValueStore, opportunityId: string): void {
  store.removeItem(editKey(opportunityId));
}

/** Text copied to the clipboard: exactly the single editable block. */
export function draftAsText(edits: TmrDraftEdits): string {
  return edits.text;
}
