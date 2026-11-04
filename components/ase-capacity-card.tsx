"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";

interface CapacityData {
  teamCapacity: number;
  teamActive: number;
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-border px-6 py-5">
      <span className="text-3xl font-semibold tabular-nums">{value}</span>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}

/** Team Capacity and Active accounts, same numbers as the SnowCats BoB dashboard. Not affected by filters. */
export function AseCapacityCard() {
  const [data, setData] = useState<CapacityData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/ase-capacity", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "ASE capacity could not be loaded.");
        if (alive) setData(body);
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  return (
    <section aria-label="ASE capacity" className="mt-5 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Gauge className="size-4 text-primary" aria-hidden="true" />
        ASE capacity
      </h2>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>
      ) : !data ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Stat label="Team Capacity" value={data.teamCapacity} hint="new accounts the team can take" />
          <Stat label="Active accounts" value={data.teamActive} hint="unique accounts across the ASE team" />
        </div>
      )}
    </section>
  );
}
