import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How to navigate" };

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
        style={{ background: "var(--brand-primary)", color: "#fff" }}
      >
        {n}
      </div>
      <div className="flex flex-col gap-1.5 pt-0.5">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function PageLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-foreground underline decoration-1 underline-offset-2 hover:opacity-70">
      {children}
    </Link>
  );
}

export default function HowToPage() {
  return (
    <main className="w-full max-w-2xl mx-auto py-10 px-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">How to navigate</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Find your accounts, check the suggested play, and open a TMR. That&apos;s it.
      </p>

      {/* The short version */}
      <div
        className="rounded-xl border px-5 py-4 mb-8 text-sm leading-relaxed"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <p>
          <strong>Go to your account and open a TMR — we&apos;ll handle the rest.</strong> You
          don&apos;t need to pick the ASE, plan the engagement, or decide between Bluebird and a
          webinar. Once the TMR is in, the ASC team reviews it, assigns the right person, and
          reaches out.
        </p>
      </div>

      <div className="flex flex-col gap-7">
        <Step n={1} title="Set your scope">
          Use the <strong className="text-foreground">Region</strong> and{" "}
          <strong className="text-foreground">Quarter</strong> buttons at the top of the{" "}
          <PageLink href="/">Overview</PageLink>. Your choice carries across every page, so set it
          once.
        </Step>

        <Step n={2} title="Find your accounts">
          <ul className="flex flex-col gap-1 list-disc list-inside">
            <li>
              <strong className="text-foreground">By name:</strong> open{" "}
              <PageLink href="/plays">Suggested Plays</PageLink> and search for the account, AE, or
              district.
            </li>
            <li>
              <strong className="text-foreground">By book:</strong> open the{" "}
              <PageLink href="/dm">DM</PageLink>, <PageLink href="/sem">SEM</PageLink>,{" "}
              <PageLink href="/ae">AE</PageLink>, or <PageLink href="/se">SE</PageLink> rollup and
              click your row to see just your uncovered Cap1s.
            </li>
          </ul>
        </Step>

        <Step n={3} title="Check the suggested play">
          Each account shows a pill — <strong className="text-foreground">ASE</strong>,{" "}
          <strong className="text-foreground">Hybrid</strong>,{" "}
          <strong className="text-foreground">Bluebird</strong>, or{" "}
          <strong className="text-foreground">Webinar</strong>. If it shows a signal like{" "}
          <strong className="text-foreground">SI involved</strong> or{" "}
          <strong className="text-foreground">OD flip</strong>, someone else may already own
          activation — double-check in Salesforce before reaching out. Not sure what a pill means?
          See the <PageLink href="/dictionary">Dictionary</PageLink>.
        </Step>

        <Step n={4} title="Open a TMR">
          On <PageLink href="/uncovered">ASE Coverage</PageLink>, find the account and click{" "}
          <strong className="text-foreground">Open TMR ↗</strong> at the end of the row. Fill in the
          account and a line or two of context — what the customer bought and anything you know about
          their goals. Submit it, and we&apos;ll take it from there.
        </Step>

        <Step n={5} title="Trust your judgment">
          The app is a starting point, not a rule. If an account clearly needs help, open a TMR even
          if the app doesn&apos;t suggest one. If something looks wrong, tell us — the data comes from
          Salesforce and can lag.
        </Step>
      </div>

      <p className="mt-10 text-[12px] text-muted-foreground">
        The app refreshes about every 10 minutes. Changes made in Salesforce can take a few hours
        to show up here.
      </p>
    </main>
  );
}
