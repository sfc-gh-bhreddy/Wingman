import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { AseAddedTable } from "@/components/ase-added-table";

export const metadata: Metadata = { title: "ASE Added" };

export default function AseAddedPage() {
  return (
    <PageShell title="ASE Added" description="How many accounts got their first ASE TMR each quarter, by district. Each account counts once. Region filter applies.">
      <AseAddedTable />
    </PageShell>
  );
}
