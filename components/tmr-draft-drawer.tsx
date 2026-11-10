"use client";

import { useEffect, useState } from "react";
import type { Deal } from "@/lib/types";
import { regionLabel } from "@/lib/constants";
import { formatUsd, formatDate } from "@/lib/format";
import {
  combinedDraftText,
  draftAsText,
  isDraftReady,
  loadEdits,
  resetEdits,
  saveEdits,
  type TmrDraftEdits,
} from "@/lib/tmr-draft";

const TMR_FORM_URL = "https://snowflake.elementum.io/services/4860adda-9a4c-460a-8698-2d7884700c55";

function draftDefaults(deal: Deal): TmrDraftEdits {
  return { text: combinedDraftText(deal.tmrDraft) };
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded border border-border px-2 py-0.5 text-[11px] font-medium hover:bg-muted disabled:opacity-40"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function TmrDraftDrawer({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const draft = deal.tmrDraft ?? null;
  const ready = isDraftReady(draft);
  const [edits, setEdits] = useState<TmrDraftEdits>(() => draftDefaults(deal));
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    const saved = loadEdits(window.localStorage, deal.opportunityId);
    setEdits(saved ?? draftDefaults(deal));
    setEdited(Boolean(saved));
  }, [deal]);

  useEffect(() => {
    if (!edited) return;
    const t = setTimeout(() => saveEdits(window.localStorage, deal.opportunityId, edits), 400);
    return () => clearTimeout(t);
  }, [edits, edited, deal.opportunityId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEdited(true);
    setEdits({ text: e.target.value });
  };

  const reset = () => {
    resetEdits(window.localStorage, deal.opportunityId);
    setEdits(draftDefaults(deal));
    setEdited(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`TMR draft for ${deal.accountName ?? "account"}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-background shadow-xl">
        <header className="sticky top-0 z-10 border-b border-border bg-background px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{deal.accountName ?? "(No name)"}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatUsd(deal.cap1Acv)} Cap1 · {regionLabel(deal.region)} · {deal.district ?? "No district"} · closed {formatDate(deal.closeDate)}
              </p>
              <p className="text-xs text-muted-foreground">
                AE {deal.owner ?? "—"} · SE {deal.leadSe ?? "—"}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded px-2 py-1 text-sm hover:bg-muted">
              ✕
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-5 py-4">
          {ready ? (
            <div className="rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-[13px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <strong>AI-drafted</strong>
              {draft?.meetingsRead ? ` from ${draft.meetingsRead} meeting${draft.meetingsRead === 1 ? "" : "s"}` : ""}
              {draft?.generatedAt ? ` on ${formatDate(draft.generatedAt.slice(0, 10))}` : ""}. Edit and double-check every field before
              you submit the TMR. Your edits are saved in this browser only.
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-[13px]">
              {draft?.status === "LOW_EVIDENCE"
                ? "Not enough call evidence to draft this TMR yet."
                : "No TMR draft is available for this deal yet."}{" "}
              Fill in the fields below from scratch, then open the TMR form.
            </div>
          )}

          {draft?.partnerConflict ? (
            <div className="rounded-md border border-red-400/60 bg-red-50 px-3 py-2 text-[13px] text-red-900 dark:bg-red-950/40 dark:text-red-200">
              Partner signals conflict for this account. Confirm partner involvement with the account team before submitting.
            </div>
          ) : null}

          <section className="flex flex-col gap-1.5">
            <label htmlFor="tmr-text" className="text-sm font-medium">TMR request (copy and paste into the TMR)</label>
            <textarea
              id="tmr-text"
              value={edits.text}
              onChange={update}
              rows={22}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-relaxed"
            />
          </section>
        </div>

        <footer className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-background px-5 py-3">
          <CopyButton text={draftAsText(edits)} label="Copy" />
          {ready ? (
            <button type="button" onClick={reset} disabled={!edited} className="rounded border border-border px-2 py-0.5 text-[11px] font-medium hover:bg-muted disabled:opacity-40">
              Reset to draft
            </button>
          ) : null}
          <a
            href={TMR_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded-md px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
            style={{ background: "var(--brand-primary)" }}
          >
            Open TMR form ↗
          </a>
        </footer>
      </aside>
    </div>
  );
}
