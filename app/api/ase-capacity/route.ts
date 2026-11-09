import { NextResponse } from "next/server";
import { getAseCapacity } from "@/lib/data";
import { getCached } from "@/lib/cache";
import { COVERAGE_TTL_MS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getCached({ name: "ase-capacity-v3-team", ttlMs: COVERAGE_TTL_MS, loader: getAseCapacity });
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[ase-capacity] refresh failed", error);
    return NextResponse.json({ error: "ASE capacity could not be loaded." }, {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
