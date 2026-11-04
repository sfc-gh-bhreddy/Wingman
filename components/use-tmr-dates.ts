"use client";

import { useEffect, useState } from "react";

let cached: { at: number; dates: Record<string, string> } | null = null;
let inflight: Promise<Record<string, string>> | null = null;
const TTL_MS = 10 * 60 * 1000;

function load(): Promise<Record<string, string>> {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.dates);
  inflight ??= fetch("/api/tmr-dates", { cache: "no-store" })
    .then(async (res) => {
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "TMR dates could not be loaded.");
      cached = { at: Date.now(), dates: body.dates };
      return body.dates as Record<string, string>;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/** First ASE TMR date per account ID, shared across pages. */
export function useTmrDates() {
  const [dates, setDates] = useState<Record<string, string> | null>(cached?.dates ?? null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let alive = true;
    setNow(new Date());
    load().then((d) => alive && setDates(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);
  return { dates, error, loading: dates === null && error === null, now };
}
