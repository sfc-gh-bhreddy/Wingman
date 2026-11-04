"use client";

import { useMemo } from "react";
import { useCoverage } from "@/components/coverage-provider";
import { useTmrDates } from "@/components/use-tmr-dates";
import { currentFiscalQuarter, quarterLabel, tmrAddedBy, type FiscalQuarter } from "@/lib/tmr-added";
import type { Deal } from "@/lib/types";

/**
 * TMRs-added counts for a rollup. Uses the selected quarter filter, or the
 * current quarter when "All" is selected.
 */
export function useTmrAddedColumn(keyOf: (deal: Deal) => string) {
  const { visibleDeals, quarter } = useCoverage();
  const { dates, now } = useTmrDates();
  const fq: FiscalQuarter | null = now
    ? quarter === "ALL" ? currentFiscalQuarter(now) : { fy: currentFiscalQuarter(now).fy, fq: Number(quarter) }
    : null;
  const counts = useMemo(
    () => (dates && fq ? tmrAddedBy(visibleDeals, dates, fq, keyOf) : null),
    // keyOf is a stable module-level function at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleDeals, dates, fq?.fy, fq?.fq],
  );
  return {
    label: `ASE TMRs added (${fq ? quarterLabel(fq) : "quarter"})`,
    addedFor: (key: string) => (counts ? counts.get(key) ?? 0 : null),
  };
}
