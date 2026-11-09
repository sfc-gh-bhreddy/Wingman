import { NextResponse } from "next/server";
import { getTmrDates } from "@/lib/data";
import { getCached } from "@/lib/cache";
import { COVERAGE_TTL_MS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dates = await getCached({ name: "tmr-dates-v1", ttlMs: COVERAGE_TTL_MS, loader: getTmrDates });
    return NextResponse.json({ dates }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[tmr-dates] refresh failed", error);
    return NextResponse.json({ error: "TMR dates could not be loaded." }, {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
