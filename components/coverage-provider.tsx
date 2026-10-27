"use client";

import * as React from "react";
import type { Deal } from "@/lib/types";
import { FOCUS_REGIONS } from "@/lib/constants";
import { attachActivationHistory, type ActivationHistoryRow } from "@/lib/activation-history";

export type RegionFilter = "FOCUS" | "ALL" | string;
export type QuarterFilter = number | "ALL";

interface CoverageState {
  deals: Deal[];
  loading: boolean;
  error: string | null;
  refreshError: string | null;
  evidenceLoading: boolean;
  evidenceError: string | null;
  region: RegionFilter;
  setRegion: (r: RegionFilter) => void;
  quarter: QuarterFilter;
  setQuarter: (q: QuarterFilter) => void;
  /** True once the client has mounted and checked localStorage */
  hasMounted: boolean;
  /** deals filtered by the current region selection (quarter-agnostic) */
  visibleDeals: Deal[];
  /** deals filtered by BOTH region and quarter (rollups + uncovered list) */
  quarterDeals: Deal[];
}

const CoverageContext = React.createContext<CoverageState | null>(null);

const CACHE_KEY = "wingmate-agg-v9-upstream-activation";
// Matches the server-side disk cache so the browser never shows data older
// than what the API would serve.
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CachedDeals {
  savedAt: number;
  rows: Deal[];
}

function readCached(): Deal[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedDeals;
    // Entries written before the TTL existed are a bare array (no savedAt) —
    // treat them as expired.
    if (typeof entry?.savedAt !== "number" || Date.now() - entry.savedAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(CACHE_KEY);
      return null;
    }
    const parsed = entry.rows;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Shape check: data written before a schema change (new signal fields) is
    // stale — drop it and refetch instead of serving zeros forever.
    if (!("isOdFlip" in parsed[0]) || !("isPartnerInvolved" in parsed[0])) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function CoverageProvider({ children }: { children: React.ReactNode }) {
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hasMounted, setHasMounted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);
  const [evidence, setEvidence] = React.useState<ActivationHistoryRow[]>([]);
  const [evidenceLoading, setEvidenceLoading] = React.useState(true);
  const [evidenceError, setEvidenceError] = React.useState<string | null>(null);
  const [region, setRegion] = React.useState<RegionFilter>("FOCUS");
  const [quarter, setQuarter] = React.useState<QuarterFilter>("ALL");

  React.useEffect(() => {
    setHasMounted(true);
    let cancelled = false;

    let inFlight = false;
    const controller = new AbortController();
    const cached = readCached();
    if (cached) {
      setDeals(cached);
      setLoading(false);

    }

    const refresh = () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      fetch("/api/coverage", { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Request failed");
        return (body.rows as Deal[]).map((deal) => ({
          ...deal,
          coverageStatus: deal.hasAnyAse ? "ASE assigned" : "No ASE",
        } satisfies Deal));
      })
      .then((data) => {
        if (cancelled) return;
        setDeals(data);
        setError(null);
        setRefreshError(null);
        try {
          const entry: CachedDeals = { savedAt: Date.now(), rows: data };
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
        } catch {
          // localStorage full/unavailable — non-fatal
        }
      })
      .catch((e) => {
        // Keep showing cached deals on a revalidation failure; only surface the
        // error when we have nothing to display.
        if (cancelled) return;
        setRefreshError(e.message);
        setDeals((cur) => {
          if (cur.length === 0) setError(e.message);
          return cur;
        });
      })
      .finally(() => {
        inFlight = false;
        if (!cancelled) setLoading(false);
      });
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const hasUpstreamActivation = deals.length > 0 && deals.every(deal => deal.activationObservedDate !== undefined);

  // The aggregate supplies production counts; keep history queries as a local fallback.
  React.useEffect(() => {
    if (loading) return;
    if (hasUpstreamActivation) {
      setEvidenceLoading(false);
      setEvidenceError(null);
      return;
    }
    let cancelled = false;
    let inFlight = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/monthly-evidence", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Monthly evidence refresh failed");
        const body = await response.json();
        if (!Array.isArray(body.rows)) throw new Error("Invalid monthly evidence response");
        if (!cancelled) {
          setEvidence(body.rows);
          setEvidenceError(null);
        }
      } catch {
        if (!cancelled) setEvidenceError("Monthly evidence refresh failed. Any displayed monthly counts use the last successful query.");
      } finally {
        inFlight = false;
        if (!cancelled) setEvidenceLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    const onVisible = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loading, hasUpstreamActivation]);

  const enrichedDeals = React.useMemo(() => attachActivationHistory(deals, evidence), [deals, evidence]);
  const visibleDeals = React.useMemo(() => {
    if (region === "ALL" || region === "FOCUS")
      return enrichedDeals.filter((d) => FOCUS_REGIONS.includes(d.region));
    return enrichedDeals.filter((d) => d.region === region);
  }, [enrichedDeals, region]);

  const quarterDeals = React.useMemo(
    () =>
      quarter === "ALL"
        ? visibleDeals
        : visibleDeals.filter((d) => d.fqNum === quarter),
    [visibleDeals, quarter],
  );

  return (
    <CoverageContext.Provider
      value={{
        deals: enrichedDeals,
        loading,
        error,
        refreshError,
        evidenceLoading,
        evidenceError,
        region,
        setRegion,
        quarter,
        setQuarter,
        hasMounted,
        visibleDeals,
        quarterDeals,
      }}
    >
      {children}
    </CoverageContext.Provider>
  );
}

export function useCoverage() {
  const ctx = React.useContext(CoverageContext);
  if (!ctx) throw new Error("useCoverage must be used within CoverageProvider");
  return ctx;
}
