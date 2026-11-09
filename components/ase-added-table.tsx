"use client";

import Link from "next/link";
import { useCoverage } from "@/components/coverage-provider";
import { useTmrDates } from "@/components/use-tmr-dates";
import { quarterLabel, quartersSoFar, tmrAddedBy } from "@/lib/tmr-added";
import type { Deal } from "@/lib/types";

const districtOf = (d: Deal) => d.district ?? "(No district)";

/** Districts x quarters: unique accounts whose first ASE TMR landed in each quarter. No targets. */
export function AseAddedTable() {
  const { visibleDeals, loading } = useCoverage();
  const { dates, error, now } = useTmrDates();
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!dates || !now || loading) return <p role="status" className="text-sm text-muted-foreground">Loading ASE TMRs...</p>;

  const quarters = quartersSoFar(now);
  const perQuarter = quarters.map((q) => tmrAddedBy(visibleDeals, dates, q, districtOf));
  const districts = [...new Set(visibleDeals.map(districtOf))].sort((a, b) => a.localeCompare(b));
  const total = (i: number) => [...perQuarter[i].values()].reduce((s, n) => s + n, 0);
  const current = quarters.length - 1;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">ASE TMRs added per district per fiscal quarter</caption>
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th scope="col" className="text-left font-medium px-4 py-2.5">District</th>
            {quarters.map((q, i) => (
              <th key={q.fq} scope="col" className="text-right font-medium px-4 py-2.5">
                {quarterLabel(q)}{i === current ? " (current)" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {districts.map((district) => (
            <tr key={district} className="border-b border-border/60 hover:bg-muted/40">
              <th scope="row" className="text-left font-medium px-4 py-2.5">
                <Link href={`/uncovered?${new URLSearchParams({ district })}`} className="text-primary hover:underline">{district}</Link>
              </th>
              {perQuarter.map((counts, i) => (
                <td key={i} className={`text-right tabular-nums px-4 py-2.5 ${i === current ? "font-semibold" : ""}`}>{counts.get(district) ?? 0}</td>
              ))}
            </tr>
          ))}
          <tr className="bg-muted/40">
            <th scope="row" className="text-left font-semibold px-4 py-2.5">Total</th>
            {perQuarter.map((_, i) => <td key={i} className="text-right tabular-nums font-semibold px-4 py-2.5">{total(i)}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
