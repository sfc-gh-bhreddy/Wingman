"use client";

import { PageShell } from "@/components/page-shell";
import { KpiCard } from "@/components/kpi-card";
import { DistrictTmrLeaderboard } from "@/components/district-tmr-leaderboard";
import { CoverageCard } from "@/components/coverage-card";
import { Callout } from "@/components/methodology-note";
import { useCoverage } from "@/components/coverage-provider";
import { summarize, byRegion } from "@/lib/aggregate";
import { formatUsd, pct1 } from "@/lib/format";
import { regionLabel, APP_DESCRIPTION } from "@/lib/constants";

export default function OverviewPage() {
  const { quarterDeals, quarter } = useCoverage();
  const scopeLabel = quarter === "ALL" ? "FY27" : `FY27 Q${quarter}`;
  const s = summarize(quarterDeals);
  const eligibleDeals = quarterDeals.filter((deal) => !deal.isSiInvolved && !deal.isOdFlip);
  const eligible = summarize(eligibleDeals);
  const excluded = s.deals - eligible.deals;
  const regions = byRegion(quarterDeals, regionLabel);

  // Whale concentration: is a single gap deal most of the gap ACV?
  const gapDeals = quarterDeals
    .filter((d) => !d.hasAnyAse)
    .sort((a, b) => b.cap1Acv - a.cap1Acv);
  const topGap = gapDeals[0];
  const topGapShare =
    topGap && s.gapAcv > 0 ? (topGap.cap1Acv / s.gapAcv) * 100 : 0;

  const medianGap = medianOf(gapDeals.map((d) => d.cap1Acv));

  return (
    <PageShell
      title="Overview"
      description={APP_DESCRIPTION}
      showQuarterFilter
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label={`Cap1 deals (${scopeLabel})`} value={s.deals} sub="closed-won Cap1s in scope" />
        <KpiCard
          label="Cap1 ACV"
          value={formatUsd(s.acv)}
          sub={`${formatUsd(s.gapAcv)} sits in uncovered deals`}
        />
        <KpiCard
          label="ASE coverage (excluding SI / OD)"
          value={eligible.deals ? pct1(eligible.pctAnyAse) : "N/A"}
          sub={`${eligible.covered} of ${eligible.deals} deals; ${excluded} excluded for SI or OD flip`}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        ASE coverage (excluding SI / OD) uses distinct Cap1 deals and the selected region and quarter. It excludes deals flagged SI involved or OD flip from both the covered count and the total; flags can overlap. These signals are review cues, not proof an ASE is unnecessary.
      </p>

      <DistrictTmrLeaderboard />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {regions.map((r) => (
          <CoverageCard
            key={r.key}
            title={r.label}
            covered={r.covered}
            deals={r.deals}
            gap={r.gap}
            acv={r.acv}
            gapAcv={r.gapAcv}
            pctAnyAse={r.pctAnyAse}
            deEmphasize={r.allOpenQuarter}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {topGapShare >= 50 ? (
          <Callout title="Gap ACV is whale-skewed">
            {topGap?.accountName ?? "One deal"} (
            {formatUsd(topGap?.cap1Acv ?? 0)}) alone is {pct1(topGapShare)} of the{" "}
            {formatUsd(s.gapAcv)} in uncovered Cap1 ACV. Typical (median) gap deal
            is {formatUsd(medianGap)} — prioritize by deal on the ASE Coverage
            list, not just by total ACV.
          </Callout>
        ) : null}
      </div>
    </PageShell>
  );
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
