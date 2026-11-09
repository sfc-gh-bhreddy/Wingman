"use client";

import { useEffect, useState } from "react";
import { useCoverage } from "@/components/coverage-provider";
import { MonthlyProgress } from "@/components/monthly-progress";
import { activationProgress, districtBacklog, districtSemNames } from "@/lib/activation-progress";
import { REPORTING_TIMEZONE } from "@/lib/monthly-progress";

export function AttachmentGoals({ district = null }: { district?: string | null }) {
  const { visibleDeals, refreshError, evidenceLoading, evidenceError } = useCoverage();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [visibleDeals]);
  const pairs = now ? activationProgress(visibleDeals, now).filter(pair => district === null || pair.district === district) : [];
  const refreshTimes = visibleDeals.map(deal => deal.refreshedAt).filter((value): value is string => Boolean(value));
  const refreshedAt = refreshTimes.length === visibleDeals.length && refreshTimes.length ? refreshTimes.sort()[0] : null;
  const evidenceTimes = visibleDeals.map(deal => deal.aseEvidenceCheckedAt).filter((value): value is string => Boolean(value));
  const evidenceCheckedAt = evidenceTimes.length === visibleDeals.length && evidenceTimes.length ? evidenceTimes.sort()[0] : null;

  return (
    <section aria-label="Monthly attachment goals" className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{now ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: REPORTING_TIMEZONE }).format(now) : "This month"} attachment goals</h2>
      <p className="text-xs text-muted-foreground">12 activation accounts per district each month, shared across SEMs.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" aria-label="District and SEM progress bars">
        {pairs.map(pair => <MonthlyProgress key={pair.key} pair={pair} semNames={districtSemNames(visibleDeals, pair.district)} backlog={districtBacklog(visibleDeals, now!, pair.district)} loading={evidenceLoading} />)}
      </div>
      {now && pairs.length === 0 && <p className="text-sm text-muted-foreground">No districts match the current region selection.</p>}
      <p className="text-xs text-muted-foreground">{refreshedAt ? `Aggregate refreshed: ${new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short", timeZone: REPORTING_TIMEZONE }).format(new Date(refreshedAt))} ET.` : "Source freshness unavailable."} Counts refresh with the account data; upstream sync and caching can delay changes.</p>
      {evidenceCheckedAt && <p className="text-xs text-muted-foreground">Monthly evidence queried: {new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "medium", timeZone: REPORTING_TIMEZONE }).format(new Date(evidenceCheckedAt))} ET. Refreshes automatically while this page is visible; source ingestion can lag.</p>}
      {evidenceLoading && <p role="status" className="text-xs text-muted-foreground">Loading monthly evidence. Districts and accounts are available independently.</p>}
      {evidenceError && <p role="alert" className="text-xs text-destructive">{evidenceError} Districts and accounts are unaffected.</p>}
      {refreshError && <p role="alert" className="text-xs text-destructive">Refresh failed. Showing previously loaded data.</p>}
    </section>
  );
}
