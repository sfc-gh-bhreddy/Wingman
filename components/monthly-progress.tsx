"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { belowTarget, type MonthlyPair } from "@/lib/monthly-progress";
import type { DistrictBacklog } from "@/lib/activation-progress";

const monthName = (month: string) => new Date(`${month}-15T12:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export function MonthlyProgress({ pair, loading = false, semNames = [], backlog }: { pair: MonthlyPair; loading?: boolean; semNames?: string[]; backlog?: DistrictBacklog }) {
  const known = pair.actual !== null && pair.target !== null;
  const warning = belowTarget(pair);
  const label = pair.target === null ? "Unassigned group - no target" :
    pair.actual === null ? `? added of ${pair.target}` : `${pair.actual} added of ${pair.target}`;
  const href = `/district?${new URLSearchParams({ district: pair.district, monthly: "1" })}`;
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 min-w-0">
      <div className="text-xs text-muted-foreground break-words">{pair.district}{semNames.length > 0 ? ` / ${semNames.join(", ")}` : ""}</div>
      <div className="flex items-center gap-2 font-semibold" role="status">
        {warning ? <AlertTriangle className="size-4 shrink-0 text-yellow-600 dark:text-yellow-400" aria-label="Below monthly target" /> :
          known ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Target met" /> :
            <Info className="size-4 shrink-0 text-muted-foreground" aria-label="Monthly data unavailable" />}
        <span>{label}</span>
      </div>
      {known ? <div role="progressbar" aria-label={`${pair.district} / ${pair.sem} monthly attachments`} aria-valuemin={0} aria-valuemax={pair.target!} aria-valuenow={Math.min(pair.actual!, pair.target!)} aria-valuetext={label} className="h-3 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${Math.min(100, pair.actual! / pair.target! * 100)}%` }} />
      </div> : <div className="h-3 rounded-full bg-muted border border-dashed border-border" aria-hidden="true" />}
      <p className="text-xs text-muted-foreground">{pair.target === null ? "Resolve the district and SEM mapping to assign a goal." :
        pair.actual === null ? (loading ? "Loading live monthly count. Target: 12 accounts/month." : `Monthly count unavailable; target remains 12 accounts/month. Historical dates missing or unverified for ${pair.unknownAccounts} accounts.`) :
        warning ? `${pair.target - pair.actual} more accounts needed this month.` : "Monthly target met."}</p>
      {backlog && pair.target !== null && <details className="text-xs">
        <summary className="cursor-pointer font-medium">Backlog accounts: {backlog.total ?? "?"}</summary>
        <ul className="mt-1 space-y-0.5 text-muted-foreground">
          {backlog.status === "none" && <li>No completed months yet.</li>}
          {backlog.months.map(m => <li key={m.month}>{monthName(m.month)}: {m.added} of {m.goal} added, {m.owed} carried over</li>)}
          {backlog.status === "unavailable" && <li>Monthly history unavailable, so backlog can&apos;t be calculated yet.</li>}
        </ul>
      </details>}
      <Link href={`/district?${new URLSearchParams({ district: pair.district })}`} className="text-xs text-primary hover:underline" aria-label={`View ${pair.district} district rollup`}>View district rollup</Link>
      {known && <Link href={href} className="text-xs text-primary hover:underline">View accounts counted this month</Link>}
    </div>
  );
}
