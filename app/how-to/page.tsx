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
        <p className="mt-2 text-muted-foreground">Find the account on <PageLink href="/uncovered">ASE Coverage</PageLink> and click its <strong className="text-foreground">name</strong> to open the AI-drafted TMR. Edit and double-check the request reason and target outcome, copy them, then click <strong className="text-foreground">Open TMR form</strong> and paste them into Elementum. Accounts without a draft show empty fields to fill in yourself. Opening the link does not submit the request.</p>
      </div>
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. Choose your view</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">DM:</strong> <PageLink href="/dm">District Rollup</PageLink> → your district for its accounts.</li>
            <li><strong className="text-foreground">SEM:</strong> <PageLink href="/sem">SEM Rollup</PageLink> → your name for your accounts.</li>
            <li><strong className="text-foreground">AE:</strong> <PageLink href="/ae">AE Rollup</PageLink> → your name for accounts on opportunities you own.</li>
            <li><strong className="text-foreground">SE:</strong> <PageLink href="/se">SE Rollup</PageLink> → your name for accounts where you are the SE.</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. Review your accounts</h2>
          <p>Use region, quarter, search, and column filters to narrow the list. <PageLink href="/uncovered">ASE Coverage</PageLink> includes both ASE assigned and No ASE. In AE/SE views, review both the regular account list and the group with potential involvement signals.</p>
          <p className="mt-2">Check existing support before opening a new request. A partner or PS pill is context, not a reason to skip an account. See the <PageLink href="/dictionary">Dictionary</PageLink> for definitions.</p>
        </section>
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. See how many ASEs were added</h2>
          <p>The <PageLink href="/">Overview</PageLink> shows the top 3 districts and SEMs by ASE TMRs added this quarter. There are no targets; use the Gap deals column on the rollups to see how many accounts still have No ASE.</p>
        </section>
      </div>
    </main>
  );
}
