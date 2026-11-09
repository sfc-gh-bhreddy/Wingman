"use client";

import { PageShell } from "@/components/page-shell";
import { RollupTable } from "@/components/rollup-table";
import { useCoverage } from "@/components/coverage-provider";
import { useTmrAddedColumn } from "@/components/use-tmr-added-column";
import { bySeManager } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

const semOf = (d: Deal) => d.seManager ?? "(No SE manager)";

export default function SemRollupPage() {
  const { quarterDeals } = useCoverage();
  const added = useTmrAddedColumn(semOf);

  return (
    <PageShell
      title="SEM Rollup"
      description="ASE coverage and ASE TMRs added by SE manager. Click an SEM to see their accounts. Region and quarter filters apply."
      showQuarterFilter
    >
      <RollupTable
        dimensionLabel="SE Manager"
        rows={bySeManager(quarterDeals)}
        showWarning={false}
        addedLabel={added.label}
        addedFor={(r) => added.addedFor(r.key)}
        hrefFor={(r) => `/uncovered?${new URLSearchParams({ sem: r.key })}`}
      />
    </PageShell>
  );
}
