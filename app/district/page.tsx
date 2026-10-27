"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { RollupTable } from "@/components/rollup-table";
import { DealsTable } from "@/components/deals-table";
import { useCoverage } from "@/components/coverage-provider";
import { byDistrict, bySeManager, districtScope, summarize } from "@/lib/aggregate";
import { formatUsd } from "@/lib/format";
import { exportCsv } from "@/lib/csv";
import { AttachmentGoals } from "@/components/attachment-goals";
import { belowTarget } from "@/lib/monthly-progress";
import { activationProgress } from "@/lib/activation-progress";

function DistrictContents() {
  const { quarterDeals, visibleDeals } = useCoverage();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [visibleDeals]);
  const params = useSearchParams();
  const district = params.get("district");
  const sem = district === null ? null : params.get("sem");
  const pairs = now ? activationProgress(visibleDeals, now) : [];
  const semPairs = now ? activationProgress(visibleDeals, now, true) : [];
  const selectedPairs = pairs.filter(pair => district === null || pair.district === district);
  const monthlyView = district !== null && params.get("monthly") === "1";
  const counted = selectedPairs.flatMap(pair => pair.accounts).filter(deal => sem === null || (deal.activationHistory?.sem ?? deal.seManager ?? "(No SE manager)") === sem);
  const scoped = monthlyView ? counted : districtScope(quarterDeals, district, sem);
  const summary = summarize(scoped);
  const districtHref = district === null ? "/district" : `/district?${new URLSearchParams({ district })}`;

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="District hierarchy" className="flex flex-wrap items-center gap-2 text-sm break-words">
        <Link href="/district" className="text-primary hover:underline">All districts</Link>
        {district !== null && <><span>/</span><Link href={districtHref} className="text-primary hover:underline">{district}</Link></>}
        {sem !== null && <><span>/</span><span aria-current="page">{sem}</span></>}
      </nav>
      <Link href="/attachment-goals" className="text-sm text-primary hover:underline">View all attachment goals</Link>
      {district !== null && <AttachmentGoals district={district} />}
      {monthlyView && <p className="text-sm">Showing accounts counted this month, regardless of close quarter. <Link href={`/district?${new URLSearchParams({ district: district!, ...(sem ? { sem } : {}) })}`} className="text-primary hover:underline">Show all accounts</Link></p>}
      {monthlyView && selectedPairs.some(pair => pair.actual === null) && <p role="status">Monthly count unavailable until historical qualification dates are supplied.</p>}
      <h2 className="text-lg font-semibold">{district === null ? "Districts" : monthlyView && sem === null ? `Accounts counted in ${district}` : sem === null ? `SE managers in ${district}` : `Accounts under ${sem}`}</h2>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>{new Set(scoped.map((deal) => deal.accountId)).size} accounts</span>
        <span>{summary.deals} Cap1 deals</span>
        <span>{formatUsd(summary.acv)} ACV</span>
        <span>{summary.covered} ASE assigned</span>
        <span>{summary.gap} No ASE</span>
      </div>
      {sem === null && !monthlyView ? (
        <RollupTable
          warningTone="yellow"
          key={districtHref}
          dimensionLabel={district === null ? "District" : "SE Manager"}
          rows={district === null ? byDistrict(scoped) : bySeManager(scoped)}
          monthlyFor={(row) => {
            const progress = district === null ? pairs.find(pair => pair.district === row.key) : semPairs.find(pair => pair.district === district && pair.sem === row.key);
            const districtProgress = pairs.find(pair => pair.district === (district ?? row.key));
            return { warning: Boolean(districtProgress && belowTarget(districtProgress)), label: progress?.actual == null ? "Loading / unavailable" : district === null ? `${progress.actual} observed additions of 12` : `${progress.actual} additions toward district goal` };
          }}
          hrefFor={(row) => `/district?${new URLSearchParams(district === null ? { district: row.key } : { district, sem: row.key })}`}
        />
      ) : (
        <>
          <div><button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted" onClick={() => exportCsv(scoped, "district-accounts.csv")}>Export accounts CSV</button></div>
          {monthlyView && <ul className="text-xs text-muted-foreground">{scoped.map(deal => <li key={deal.accountId}>{deal.accountName}: {deal.activationObservedDate ?? deal.activationHistory?.firstObservedDate} — recorded activation date</li>)}</ul>}
          <DealsTable key={`${districtHref}&${sem}`} deals={scoped} showColumns={{ owner: true, leadSe: true }} />
        </>
      )}
    </div>
  );
}

export default function DistrictPage() {
  return (
    <PageShell title="District Rollup" description="Select a district, then an SE manager to see their accounts with AE, SE and ASE assignment status. Region and quarter filters apply throughout." showQuarterFilter>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading districts...</p>}><DistrictContents /></Suspense>
    </PageShell>
  );
}
