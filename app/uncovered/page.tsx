"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download, ChevronDown } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { DealsTable } from "@/components/deals-table";
import { StatusBadge } from "@/components/status-badge";
import { useCoverage } from "@/components/coverage-provider";
import { summarize } from "@/lib/aggregate";
import { exportCsv } from "@/lib/csv";
import { formatUsd } from "@/lib/format";
import { regionLabel } from "@/lib/constants";
import type { Deal } from "@/lib/types";
import { useAccountReviews } from "@/components/use-account-reviews";
import { MARK_LABELS, marksAsInvolved, type AccountMark } from "@/lib/account-review-types";

const REVIEW_SIGNALS = [
  { label: "SI involved", matches: (deal: Deal) => deal.isSiInvolved },
  { label: "Partner involved", matches: (deal: Deal) => deal.isPartnerInvolved },
  { label: "PS involved", matches: (deal: Deal) => deal.isPsInvolved },
  { label: "Partner acct", matches: (deal: Deal) => deal.isPartnerAccount },
];

function signalLabels(deal: Deal): string[] {
  return REVIEW_SIGNALS.filter((signal) => signal.matches(deal)).map((signal) => signal.label);
}

function UncoveredInner() {
  const { quarterDeals } = useCoverage();
  const params = useSearchParams();

  const drillRegion = params.get("region");
  const drillDistrict = params.get("district");
  const drillSem = params.get("sem");
  const drillSe = params.get("se");
  const drillOwner = params.get("owner");
  const drillAse = params.get("ace");

  let deals = quarterDeals;

  let drillLabel: string | null = null;
  if (drillRegion) {
    deals = deals.filter((d) => d.region === drillRegion);
    drillLabel = `Region: ${regionLabel(drillRegion)}`;
  } else if (drillDistrict) {
    deals = deals.filter((d) => (d.district ?? "(No district)") === drillDistrict);
    drillLabel = `District: ${drillDistrict}`;
  } else if (drillSem) {
    deals = deals.filter((d) => (d.seManager ?? "(No SEM)") === drillSem);
    drillLabel = `SEM: ${drillSem}`;
  } else if (drillSe) {
    deals = deals.filter((d) => (d.leadSe ?? "(No SE)") === drillSe);
    drillLabel = `SE: ${drillSe}`;
  } else if (drillOwner) {
    deals = deals.filter((d) => (d.owner ?? "(No owner)") === drillOwner);
    drillLabel = `AE: ${drillOwner}`;
  } else if (drillAse) {
    deals = deals.filter((d) => d.assignedAse === drillAse);
    drillLabel = `ASE: ${drillAse}`;
  }

  // Default sort: No ASE first, then by close date
  const sorted: Deal[] = [...deals].sort((a, b) => {
    const aStatus = a.hasAnyAse ? 1 : 0;
    const bStatus = b.hasAnyAse ? 1 : 0;
    if (aStatus !== bStatus) return aStatus - bStatus;
    const ax = a.closeDate ?? "";
    const bx = b.closeDate ?? "";
    if (!ax && !bx) return 0;
    if (!ax) return 1;
    if (!bx) return -1;
    return bx.localeCompare(ax);
  });
  // AE/SE drill-downs keep the existing deal scope, but separate accounts
  // with potential external involvement so they can still be reviewed.
  const isPersonDrill = Boolean(drillSe || drillOwner);
  const reviews = useAccountReviews();
  const filtered = sorted;
  // Partition by account: an opportunity-level registration can flag only one
  // of several deals, but the account should appear in just one section.
  const autoReviewIds = new Set(
    isPersonDrill ? filtered.filter((deal) => signalLabels(deal).length > 0).map((deal) => deal.accountId) : [],
  );
  // Saved AE/SE overrides decide placement; unsaved edits wait for Save so rows don't jump.
  const reviewAccountIds = new Set(
    isPersonDrill
      ? [...new Set(filtered.map((deal) => deal.accountId))].filter((id) => {
          const mark = reviews.saved.get(id)?.mark;
          if (mark === "NO_ASE") return false;
          return marksAsInvolved(mark) || autoReviewIds.has(id);
        })
      : [],
  );
  const accountHasAse = new Set(filtered.filter((deal) => deal.hasAnyAse).map((deal) => deal.accountId));
  const regularDeals = isPersonDrill
    ? filtered.filter((deal) => !reviewAccountIds.has(deal.accountId))
    : filtered;
  const reviewDeals = isPersonDrill
    ? filtered.filter((deal) => reviewAccountIds.has(deal.accountId))
    : [];
  const reviewAccountCount = new Set(reviewDeals.map((deal) => deal.accountId)).size;
  const accountSignals = new Map<string, Set<string>>();
  for (const deal of reviewDeals) {
    const labels = accountSignals.get(deal.accountId) ?? new Set<string>();
    signalLabels(deal).forEach((label) => labels.add(label));
    const mark = reviews.saved.get(deal.accountId)?.mark;
    if (marksAsInvolved(mark)) labels.add(`Marked: ${MARK_LABELS[mark as AccountMark]}`);
    accountSignals.set(deal.accountId, labels);
  }
  const signalCounts = [...REVIEW_SIGNALS.map((signal) => signal.label), ...(["NOT_FIT", "PS", "SI"] as const).map((m) => `Marked: ${MARK_LABELS[m]}`)].map((label) => ({
    label,
    count: [...accountSignals.values()].filter((labels) => labels.has(label)).length,
  })).filter((signal) => signal.count > 0);

  // Editable status for accounts with no ASE. Accounts that already have an ASE keep the badge.
  const renderStatus = isPersonDrill
    ? (deal: Deal) => {
        if (accountHasAse.has(deal.accountId)) return <StatusBadge status={deal.coverageStatus} />;
        const auto = autoReviewIds.has(deal.accountId);
        const shown = reviews.shownMark(deal.accountId);
        const dirty = reviews.pending.has(deal.accountId);
        const saved = reviews.saved.get(deal.accountId);
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="relative inline-flex items-center">
              <select
                aria-label={`Status for ${deal.accountName ?? "account"}`}
                value={shown ?? ""}
                disabled={reviews.saving}
                onChange={(e) => reviews.setMark(deal.accountId, (e.target.value || null) as AccountMark | null)}
                className="appearance-none cursor-pointer rounded-full border bg-muted pl-2 pr-5 py-0.5 text-[11px] font-medium text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderColor: dirty ? "var(--brand-primary)" : "var(--border)" }}
              >
                {/* Auto-signal accounts have no "No ASE" default; the placeholder isn't selectable. */}
                {auto ? <option value="" disabled hidden>Review status</option> : (
                  <option value="">{reviewAccountIds.has(deal.accountId) ? "Move to No ASE" : MARK_LABELS.NO_ASE}</option>
                )}
                {auto ? <option value="NO_ASE">{reviewAccountIds.has(deal.accountId) ? "Move to No ASE" : MARK_LABELS.NO_ASE}</option> : null}
                <option value="NOT_FIT">{MARK_LABELS.NOT_FIT}</option>
                <option value="PS">{MARK_LABELS.PS}</option>
                <option value="SI">{MARK_LABELS.SI}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-muted-foreground" aria-hidden="true" />
            </span>
            {dirty ? (
              <span className="text-[10px]" style={{ color: "var(--brand-primary)" }}>Unsaved</span>
            ) : saved ? (
              <span className="text-[10px] text-muted-foreground" title={`Updated ${new Date(saved.updatedAt).toLocaleString()}`}>
                by {saved.updatedBy}
              </span>
            ) : null}
          </div>
        );
      }
    : undefined;
  const s = summarize(filtered);
  // Person drills (AE / SE / SEM): hide the person being drilled, show the other two roles, no Quarter column.
  const tableColumns = drillOwner
    ? { district: true, seManager: true, leadSe: true, quarter: false }
    : drillSe
      ? { district: true, seManager: true, owner: true, quarter: false }
      : drillSem
        ? { district: true, owner: true, leadSe: true, quarter: false }
        : { district: true, seManager: true, owner: true };
  const hideTmrLink = Boolean(drillDistrict || drillOwner);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {drillLabel ? (
              <>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    borderColor: "var(--brand-primary)",
                    color: "var(--brand-primary)",
                  }}
                >
                  {drillLabel}
                </span>
                <Link
                  href="/uncovered"
                  className="text-xs hover:underline"
                  style={{ color: "var(--brand-primary)" }}
                >
                  Clear
                </Link>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => exportCsv(filtered, "ase-coverage-cap1s.csv")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{s.deals}</strong> Cap1 deals
          </span>
          <span>
            <strong className="text-foreground">{formatUsd(s.acv)}</strong> Cap1 ACV
          </span>
          <span>median deal {formatUsd(medianAcv(filtered))}</span>
        </div>

        {isPersonDrill ? <h2 className="text-sm font-semibold">Accounts without review signals ({new Set(regularDeals.map((deal) => deal.accountId)).size})</h2> : null}
        <DealsTable
          deals={regularDeals}
          showColumns={tableColumns}
          hideTmrLink={hideTmrLink}
          renderStatus={renderStatus}
        />
        {isPersonDrill ? (
          <section className="flex flex-col gap-3 border-t border-border pt-5" aria-label="Accounts with potential involvement">
            <h2 className="text-sm font-semibold">Accounts with potential involvement ({reviewAccountCount})</h2>
            <p className="text-xs text-muted-foreground">
              A partner, SI, or PS may be involved, or the AE/SE flagged it. Add an ASE if they still need help, or use <strong>Move to No ASE</strong>.
            </p>
            {signalCounts.length > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {signalCounts.map((signal) => <span key={signal.label}>{signal.label}: {signal.count} account{signal.count === 1 ? "" : "s"}</span>)}
              </div>
            ) : null}
            <DealsTable
              deals={reviewDeals}
              showColumns={tableColumns}
              signalLabels={(deal) => [...(accountSignals.get(deal.accountId) ?? [])]}
              hideTmrLink={hideTmrLink}
              renderStatus={renderStatus}
            />
            <p className="text-xs text-muted-foreground">
              Potential involvement is a review cue, not a reason to skip outreach. Add ASE support if the account still needs it.
            </p>
          </section>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Sorted by status (No ASE first), then by close date. Use column headers to re-sort or filter.
        </p>
        {isPersonDrill && (reviews.dirtyCount > 0 || reviews.error) ? (
          <div
            role="region"
            aria-label="Unsaved status changes"
            className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm shadow-lg"
            style={{ borderColor: "var(--brand-primary)" }}
          >
            {reviews.dirtyCount > 0 ? (
              <span>{reviews.dirtyCount} unsaved change{reviews.dirtyCount === 1 ? "" : "s"}</span>
            ) : null}
            {reviews.error ? <span role="alert" className="text-destructive">{reviews.error}</span> : null}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={reviews.discard}
                disabled={reviews.saving}
                className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={reviews.save}
                disabled={reviews.saving || reviews.dirtyCount === 0}
                className="rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                style={{ background: "var(--brand-primary)" }}
              >
                {reviews.saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function medianAcv(deals: Deal[]): number {
  if (deals.length === 0) return 0;
  const v = deals.map((d) => d.cap1Acv).sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export default function UncoveredPage() {
  return (
    <PageShell
      title="ASE Coverage"
      description="All Cap1 deals in the selected region and quarter, including ASE assigned and No ASE. Use column filters to drill down."
      showQuarterFilter
    >
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Loading list...</div>
        }
      >
        <UncoveredInner />
      </Suspense>
    </PageShell>
  );
}
