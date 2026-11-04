"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useCoverage } from "@/components/coverage-provider";
import { useTmrDates } from "@/components/use-tmr-dates";
import { currentFiscalQuarter, quarterLabel, tmrAddedBy, topAdded } from "@/lib/tmr-added";

const NO_DISTRICT = "(No district)";
const NO_SEM = "(No SE manager)";

function TopList({ title, rows, hrefFor, empty }: {
  title: string;
  rows: { key: string; added: number }[] | null;
  hrefFor: (key: string) => string;
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 min-w-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows === null ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link href={hrefFor(row.key)} className="truncate text-primary hover:underline">{row.key}</Link>
              <span className="shrink-0 tabular-nums font-semibold">{row.added} <span className="font-normal text-muted-foreground">added</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TopAseAdded() {
  const { visibleDeals, loading: dealsLoading } = useCoverage();
  const { dates, error, now } = useTmrDates();
  const quarter = now ? currentFiscalQuarter(now) : null;
  const ready = Boolean(dates && quarter && !dealsLoading);
  const districts = ready ? topAdded(tmrAddedBy(visibleDeals, dates!, quarter!, (d) => d.district ?? NO_DISTRICT)) : null;
  const sems = ready ? topAdded(tmrAddedBy(visibleDeals, dates!, quarter!, (d) => d.seManager ?? NO_SEM)) : null;

  return (
    <section aria-label="ASE TMRs added this quarter" className="mt-5 flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <UserPlus className="size-4 text-primary" aria-hidden="true" />
          ASE TMRs added
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">Top added this quarter</p>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TopList title="Top 3 districts" rows={districts} empty="No ASE TMRs added yet this quarter."
            hrefFor={(key) => `/uncovered?${new URLSearchParams({ district: key })}`} />
          <TopList title="Top 3 SEMs" rows={sems} empty="No ASE TMRs added yet this quarter."
            hrefFor={(key) => `/uncovered?${new URLSearchParams({ sem: key })}`} />
        </div>
      )}
    </section>
  );
}
