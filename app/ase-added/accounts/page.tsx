"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useCoverage } from "@/components/coverage-provider";
import { useTmrDates } from "@/components/use-tmr-dates";
import { formatUsd } from "@/lib/format";
import { currentFiscalQuarter, quarterLabel, tmrAddedAccounts } from "@/lib/tmr-added";
import type { Deal } from "@/lib/types";

const NO_DISTRICT = "(No district)";
const NO_SEM = "(No SEM)";

function AddedAccountsInner() {
  const params = useSearchParams();
  const sem = params.get("sem");
  const district = params.get("district");
  const { visibleDeals, loading: dealsLoading } = useCoverage();
  const { dates, error, now } = useTmrDates();

  const by = sem !== null
    ? { label: "SEM", key: sem, keyOf: (d: Deal) => d.seManager ?? NO_SEM }
    : district !== null
      ? { label: "District", key: district, keyOf: (d: Deal) => d.district ?? NO_DISTRICT }
      : null;
  const quarter = now ? currentFiscalQuarter(now) : null;
  const ready = Boolean(by && dates && quarter && !dealsLoading);
  const rows = ready ? tmrAddedAccounts(visibleDeals, dates!, quarter!, by!.keyOf, by!.key) : [];

  return (
    <PageShell
      title={by ? `ASE TMRs added: ${by.key}` : "ASE TMRs added"}
      description={quarter ? `Accounts that got their first ASE TMR in ${quarterLabel(quarter)}. Each account counts once. Region filter applies.` : "Accounts that got their first ASE TMR this quarter."}
    >
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to Overview
      </Link>
      {!by ? (
        <p className="mt-4 text-sm text-muted-foreground">Pick a district or SEM from the Overview page.</p>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>
      ) : !ready ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No ASE TMRs added this quarter.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">TMR added</th>
                <th className="px-4 py-2 font-medium">AE</th>
                <th className="px-4 py-2 font-medium">SE</th>
                <th className="px-4 py-2 font-medium">{sem !== null ? "District" : "SEM"}</th>
                <th className="px-4 py-2 text-right font-medium">Cap1 ACV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ deal, tmrDate }) => (
                <tr key={deal.accountId}>
                  <td className="px-4 py-2 font-medium">{deal.accountName ?? deal.accountId}</td>
                  <td className="px-4 py-2 tabular-nums">{tmrDate}</td>
                  <td className="px-4 py-2">{deal.owner ?? "\u2014"}</td>
                  <td className="px-4 py-2">{deal.leadSe ?? "\u2014"}</td>
                  <td className="px-4 py-2">{(sem !== null ? deal.district : deal.seManager) ?? "\u2014"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatUsd(deal.cap1Acv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

export default function AddedAccountsPage() {
  return (
    <Suspense fallback={null}>
      <AddedAccountsInner />
    </Suspense>
  );
}
