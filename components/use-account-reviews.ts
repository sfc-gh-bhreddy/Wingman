"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountMark, AccountReview, AccountReviewChange } from "@/lib/account-review-types";

/**
 * Loads saved account overrides and holds unsaved edits. Pending values use
 * `null` to mean "clear the saved override" (back to automatic placement).
 */
export function useAccountReviews() {
  const [saved, setSaved] = useState<Map<string, AccountReview>>(new Map());
  const [pending, setPending] = useState<Map<string, AccountMark | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((list: AccountReview[]) => {
    setSaved(new Map(list.map((r) => [r.accountId, r])));
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/account-review", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Saved statuses could not be loaded.");
        if (alive) apply(body.reviews);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [apply]);

  /** Stage a change; picking the saved value again drops it from pending. */
  const setMark = useCallback((accountId: string, mark: AccountMark | null) => {
    setPending((prev) => {
      const next = new Map(prev);
      const current = saved.get(accountId)?.mark ?? null;
      if (mark === current) next.delete(accountId);
      else next.set(accountId, mark);
      return next;
    });
  }, [saved]);

  const discard = useCallback(() => { setPending(new Map()); setError(null); }, []);

  const save = useCallback(async () => {
    if (pending.size === 0) return;
    const changes: AccountReviewChange[] = [...pending].map(([accountId, mark]) => ({ accountId, mark }));
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Changes could not be saved.");
      apply(body.reviews);
      setPending(new Map());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }, [pending, apply]);

  /** The value to show in a dropdown: pending edit if any, else the saved mark. */
  const shownMark = useCallback((accountId: string): AccountMark | null => {
    return pending.has(accountId) ? pending.get(accountId) ?? null : saved.get(accountId)?.mark ?? null;
  }, [pending, saved]);

  return useMemo(() => ({
    saved, pending, loading, saving, error, setMark, shownMark, save, discard, dirtyCount: pending.size,
  }), [saved, pending, loading, saving, error, setMark, shownMark, save, discard]);
}
