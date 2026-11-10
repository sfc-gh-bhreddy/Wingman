"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";

interface CapacityData {
  teamCapacity: number;
  teamActive: number;
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
    <section
      aria-label="Estimated team capacity"
      className="mt-8 flex flex-col gap-4 rounded-xl border border-primary/15 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Gauge className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated team capacity:</p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        ) : !data ? (
          <p role="status" className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <p className="text-sm">
            <span className="font-semibold tabular-nums">~{data.teamCapacity}</span> new accounts
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="font-semibold tabular-nums">{data.teamActive}</span> active today
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Regardless of capacity, submit a TMR for every account that needs help.</p>
      </div>
    </section>
  );
}
