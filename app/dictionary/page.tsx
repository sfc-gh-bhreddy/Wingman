import type { Metadata } from "next";
import Link from "next/link";
import { MethodologyNote } from "@/components/methodology-note";

export const metadata: Metadata = { title: "Dictionary" };

export default function DictionaryPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Dictionary</h1>
      <p className="mb-7 text-sm text-muted-foreground">What the numbers mean and where to find your book.</p>
      <div className="space-y-7 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">ASE TMRs added</h2>
          <p>The number of accounts that got their <strong className="text-foreground">first ASE TMR</strong> in a fiscal quarter. Each account counts once, in the quarter its first ASE TMR was opened. There is no target; this shows how many ASEs were added and where there is still room to add more.</p>
          <p className="mt-2">Fiscal quarters: Q1 Feb to Apr, Q2 May to Jul, Q3 Aug to Oct, Q4 Nov to Jan.</p>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">ASE capacity</h2>
          <p><strong className="text-foreground">Open capacity = (number of ASEs x 15) - active accounts.</strong> This is how many new TMRs the ASE team can take right now. Each ASE targets 15 active accounts. An account counts as active when an ASE has it marked Active in their book of business; an account shared by two ASEs counts once.</p>
          <p className="mt-2">Capacity is team-wide, so region and quarter filters do not change it.</p>
        </section>
        <section aria-label="Triangle meaning">
          <h2 className="mb-2 text-base font-semibold text-foreground">What the red triangle means</h2>
          <MethodologyNote />
          <p className="mt-2">The red triangle appears on the AE and SE rollups only.</p>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Where to find your book</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">DM:</strong> <Link className="text-primary hover:underline" href="/dm">District Rollup</Link>, then select your district.</li>
            <li><strong className="text-foreground">SEM:</strong> <Link className="text-primary hover:underline" href="/sem">SEM Rollup</Link>, then select your name.</li>
            <li><strong className="text-foreground">AE / SE:</strong> open your rollup and select your name. AE accounts are grouped by opportunity owner; SE accounts by SE.</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Reading the numbers</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">Cap1 deals / ACV:</strong> first-capacity deals and their contract value. Deal totals count unique opportunities.</li>
            <li><strong className="text-foreground">ASE coverage:</strong> deals with ASE evidence divided by all deals in scope. The adjusted Overview rate excludes SI-involved deals only; OD flips are included everywhere.</li>
            <li><strong className="text-foreground">Gap deals:</strong> deals with No ASE. These are the accounts to look at for adding an ASE.</li>
            <li><strong className="text-foreground">Top 3 districts and SEMs:</strong> on the Overview, the districts and SEMs with the most ASE TMRs added in the current quarter.</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Additional information</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">Refresh timing:</strong> app data is cached for 10 minutes; source updates can take longer to appear.</li>
            <li><strong className="text-foreground">Credit:</strong> uses current district and SEM assignments, not ownership when the TMR was opened.</li>
            <li><strong className="text-foreground">Scope:</strong> counts accounts in Wingman&apos;s FY27 first-capacity roster and selected region.</li>
            <li><strong className="text-foreground">Quarter filter:</strong> on the rollups, the TMRs added column follows the selected quarter. With All selected it shows the current quarter.</li>
            <li><strong className="text-foreground">A TMR is missing:</strong> check the TMR was submitted in Elementum with an ASE specialist type, then allow for refresh. Opening the Open TMR link alone does not submit a request.</li>
            <li><strong className="text-foreground">TMR drafts:</strong> on ASE Coverage, click an account name to see an AI-drafted request reason and target outcome built from recent calls. A green dot means a draft is ready. Drafts can be wrong or incomplete, so edit and double-check every field before you copy it into the TMR form. Edits are saved in your browser only.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
