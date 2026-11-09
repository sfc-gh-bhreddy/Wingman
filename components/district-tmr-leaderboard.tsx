"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { useCoverage } from "@/components/coverage-provider";
import { observedActivationLeaderboard, districtSemNames } from "@/lib/activation-progress";

export function DistrictTmrLeaderboard() {
  const { visibleDeals, loading, error, refreshError, evidenceLoading, evidenceError } = useCoverage();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const result = now ? observedActivationLeaderboard(visibleDeals, now) : null;
  const pending = !result || loading || evidenceLoading;
  const failed = Boolean(error || refreshError || evidenceError);
  const ready = !pending && !failed && result.status === "ready";
  const empty = !pending && !failed && result.status === "empty";
  const message = pending ? "Loading monthly rankings..."
    : failed ? "Coverage refresh failed. Rankings will return after a successful refresh."
    : result.status === "unavailable" ? result.reason
    : empty ? result.reason : null;

  return (
    <section aria-label="Monthly district leaderboard" className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="bg-gradient-to-r from-[#104563] to-[#1376a5] px-5 py-4 text-white">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Trophy className="size-5 shrink-0 text-amber-300" aria-hidden="true" />Top 3 districts</h2>
        <p className="mt-1 text-sm text-sky-100">{result?.period.label ?? "This month"} | Monthly goal: 12 accounts per district</p>
      </header>
      <div className="px-4 py-3 text-xs text-muted-foreground">
        Unique accounts with recorded activation dates this month, using the same counts as Attachment Goals. Region filters apply; Overview quarter filters do not.
      </div>
      {message ? <p role={failed ? "alert" : "status"} className="px-4 pb-3 text-sm text-muted-foreground">{message}</p> : null}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Monthly district rankings table">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <caption className="sr-only">Monthly top three districts by recorded activation additions. Dashes indicate unavailable rankings, not zero.</caption>
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th scope="col" className="border-y border-r border-border px-4 py-3 text-left font-medium">Rank</th>
              <th scope="col" className="border-y border-r border-border px-4 py-3 text-left font-medium">District / SEMs</th>
              <th scope="col" className="border-y border-r border-border px-4 py-3 text-right font-medium">Accounts added</th>
              <th scope="col" className="border-y border-r border-border px-4 py-3 text-right font-medium">Monthly goal</th>
              <th scope="col" className="border-y border-border px-4 py-3 text-right font-medium">Goal attainment</th>
            </tr>
          </thead>
          <tbody>
            {ready ? result.rows.map(row => (
              <tr key={row.district} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                <td className="border-r border-border px-4 py-3 tabular-nums"><span className="flex items-center gap-2">{row.rank === 1 ? <Trophy className="size-4 text-amber-500" aria-hidden="true" /> : null}{row.rank}</span></td>
                <th scope="row" className="border-r border-border px-4 py-3 text-left font-medium"><Link href={`/district?${new URLSearchParams({district: row.district})}`} className="text-primary hover:underline focus-visible:outline-2" aria-label={`Open ${row.district} district rollup`}>{row.district}</Link>{districtSemNames(visibleDeals, row.district).length > 0 ? <span className="ml-2 font-normal text-muted-foreground">/ {districtSemNames(visibleDeals, row.district).join(", ")}</span> : null}</th>
                <td className="border-r border-border px-4 py-3 text-right tabular-nums">{row.additions}</td>
                <td className="border-r border-border px-4 py-3 text-right tabular-nums">12</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{row.score.toFixed(1)}%</td>
              </tr>
            )) : empty ? <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No ranked districts this month.</td></tr>
              : [1, 2, 3].map(slot => (
                <tr key={slot} aria-label={`Pending ranking slot ${slot}`} className="border-b border-border last:border-b-0 text-muted-foreground">
                  <td className="border-r border-border px-4 py-3">&mdash;</td>
                  <td className="border-r border-border px-4 py-3">Awaiting ranking</td>
                  <td className="border-r border-border px-4 py-3 text-right">&mdash;</td>
                  <td className="border-r border-border px-4 py-3 text-right tabular-nums">12</td>
                  <td className="px-4 py-3 text-right">&mdash;</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <footer className="space-y-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {!ready && !empty ? <p>Waiting for recorded activation dates to load. Dashes mean unavailable, not zero.</p> : null}
        {ready && result.tiedCutoff ? <p>More districts tie at the cutoff. Three are shown alphabetically within tied ranks.</p> : null}
        {result && result.excludedAccounts > 0 ? <p>{result.excludedAccounts} accounts excluded because their district is missing.</p> : null}
      </footer>
    </section>
  );
}
