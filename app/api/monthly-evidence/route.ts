import { NextResponse } from "next/server";
import { getActivationHistory } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ rows: await getActivationHistory(), mode: "activation-history" }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[monthly-evidence] refresh failed", error);
    return NextResponse.json({ error: "Monthly evidence could not be refreshed." }, {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
