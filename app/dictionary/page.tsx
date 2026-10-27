import type { Metadata } from "next";
import Link from "next/link";
import { DistrictGoalNote, MethodologyNote } from "@/components/methodology-note";

export const metadata: Metadata = { title: "Dictionary" };

export default function DictionaryPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Dictionary</h1>
      <p className="mb-7 text-sm text-muted-foreground">Your goals, your book, and how to read the numbers.</p>
      <div className="space-y-7 text-sm leading-relaxed text-muted-foreground">
        <section aria-label="Triangle meanings">
          <h2 className="mb-2 text-base font-semibold text-foreground">What the triangles mean</h2>
          <div className="space-y-3"><DistrictGoalNote /><MethodologyNote /></div>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Attachment Goals</h2>
          <p><strong className="text-foreground">12 new accounts per district each month.</strong> The DM and SEMs share one district goal, not 12 per SEM. Each account counts once in the month of its first recorded activation date; rolloffs do not remove earned credit.</p>
          <p className="mt-2"><strong className="text-foreground">Carryover policy:</strong> missed additions carry into the next month. Add 10 against a goal of 12, and next month&apos;s goal is 14. Carryover is not yet included in the app&apos;s displayed targets or scores.</p>
          <p className="mt-2">A warning triangle means below the displayed goal; a check means the goal is met. A question mark or dash means the count is unavailable, not zero.</p>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Where to find your book</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">DM:</strong> open <Link className="text-primary hover:underline" href="/attachment-goals">Attachment Goals</Link> for your district&apos;s goal, then View district rollup for the team breakdown.</li>
            <li><strong className="text-foreground">SEM:</strong> open <Link className="text-primary hover:underline" href="/district">District Rollup</Link>, choose your district, then your name. Your contributions count toward that district&apos;s shared goal.</li>
            <li><strong className="text-foreground">AE / SE:</strong> open your rollup and select your name. AE accounts are grouped by opportunity owner; SE accounts by lead SE. Both assigned and unassigned accounts are included.</li>
          </ul>
          <p className="mt-2">AE/SE account lists separate accounts without review signals from those with potential SI, partner, PS, partner-account, or OD-flip involvement. Review both groups.</p>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Reading the numbers</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">Cap1 deals / ACV:</strong> first-capacity deals and their contract value. Deal totals count unique opportunities; account totals count unique accounts.</li>
            <li><strong className="text-foreground">Coverage:</strong> deals with ASE evidence divided by all deals in scope. The adjusted Overview rate excludes SI-involved and OD-flip deals from both counts.</li>
            <li><strong className="text-foreground">Top 3 districts:</strong> ranks districts by unique accounts with recorded activation dates this month, using the same counts as Attachment Goals. Goal attainment = accounts added / 12 x 100. Missing dates are not credited.</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Additional information</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">Refresh timing:</strong> the open page checks every minute. App data is cached for 10 minutes; source updates can take longer to appear.</li>
            <li><strong className="text-foreground">Accounts added:</strong> uses the account&apos;s first recorded activation date, not its deal close date or TMR submission date. An October date counts toward October.</li>
            <li><strong className="text-foreground">Counted once:</strong> multiple deals or use cases do not add extra monthly credit. Rolloffs do not remove credit.</li>
            <li><strong className="text-foreground">Missing dates:</strong> an account can show ASE assigned without counting as added this month. A valid activation date in the month is required.</li>
            <li><strong className="text-foreground">District credit:</strong> uses current district and SEM assignments, not ownership at the time of activation. Reassignments can move credit between teams.</li>
            <li><strong className="text-foreground">Monthly scope:</strong> counts accounts in Wingman&apos;s FY27 first-capacity roster and selected region, not the district&apos;s entire account book.</li>
            <li><strong className="text-foreground">Filters and dates:</strong> quarter filters change deal views, not monthly goals or rankings. The reporting month follows Eastern time.</li>
            <li><strong className="text-foreground">Partner and OD signals:</strong> SI, partner, PS, partner-account and on-demand conversion flags highlight accounts for review; they do not exclude qualifying monthly additions.</li>
            <li><strong className="text-foreground">An addition is missing:</strong> check the recorded activation date, current district and selected region, then allow for refresh. Opening a TMR link alone does not submit a request or earn credit.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
