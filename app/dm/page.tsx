"use client";

import { PageShell } from "@/components/page-shell";
import { RollupTable } from "@/components/rollup-table";
import { useCoverage } from "@/components/coverage-provider";
import { useTmrAddedColumn } from "@/components/use-tmr-added-column";
import { byDistrict } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

const districtOf = (d: Deal) => d.district ?? "(No district)";

export default function DmRollupPage() {
  const { quarterDeals } = useCoverage();
  const added = useTmrAddedColumn(districtOf);

  return (
    <PageShell
      title="District Rollup"
      description="ASE coverage and ASE TMRs added by district (DM). Click a district to see its accounts. Region and quarter filters apply."
      showQuarterFilter
    >
      <RollupTable
        dimensionLabel="District"
        rows={byDistrict(quarterDeals)}
        showWarning={false}
        addedLabel={added.label}
        addedFor={(r) => added.addedFor(r.key)}
        hrefFor={(r) => `/uncovered?${new URLSearchParams({ district: r.key })}`}
      />
    </PageShell>
  );
}
