import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How to navigate" };

function PageLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="font-medium text-primary hover:underline">{children}</Link>;
}

export default function HowToPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">How to navigate</h1>
      <p className="mb-7 text-sm text-muted-foreground">Find your book, review coverage, and request ASE support.</p>
      <div className="mb-7 rounded-xl border border-border bg-card p-5 text-sm">
        <h2 className="font-semibold">Need an ASE? Submit a TMR.</h2>
        <p className="mt-2 text-muted-foreground">Find the account on <PageLink href="/uncovered">ASE Coverage</PageLink> and click <strong className="text-foreground">Open TMR</strong> at the end of its row. This opens Elementum; complete the request there with the account and customer goals. Opening the link does not submit the request.</p>
      </div>
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. Choose your view</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">DM:</strong> <PageLink href="/attachment-goals">Attachment Goals</PageLink> shows your district&apos;s monthly goal. Select View district rollup to see SEM contributions.</li>
            <li><strong className="text-foreground">SEM:</strong> <PageLink href="/district">District Rollup</PageLink> → your district → your name → your accounts. You contribute to the district&apos;s shared goal of 12, not a separate SEM quota.</li>
            <li><strong className="text-foreground">AE:</strong> <PageLink href="/ae">AE Rollup</PageLink> → your name for accounts on opportunities you own.</li>
            <li><strong className="text-foreground">SE:</strong> <PageLink href="/se">SE Rollup</PageLink> → your name for accounts where you are the lead SE.</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. Review your accounts</h2>
          <p>Use region, quarter, search, and column filters to narrow the list. <PageLink href="/uncovered">ASE Coverage</PageLink> includes both ASE assigned and No ASE. In AE/SE views, review both the regular account list and the group with potential involvement signals.</p>
          <p className="mt-2">Check existing support before opening a new request. A partner or PS pill is context, not a reason to skip an account. See the <PageLink href="/dictionary">Dictionary</PageLink> for goals and calculations.</p>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. Track the district goal</h2>
          <p>The monthly base goal is 12 new activation accounts per district, shared by the DM and SEMs. Missed additions carry forward: 10 added means 14 due next month. The app does not yet include carryover in displayed targets.</p>
          <p className="mt-2">Monthly goals ignore deal-quarter filters. Counts marked with a question mark or dash are not available yet. The Overview&apos;s Top 3 table ranks districts using the same monthly activation additions as Attachment Goals.</p>
        </section>
      </div>
    </main>
  );
}
