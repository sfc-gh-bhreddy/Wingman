import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { listReviews, ReviewInputError, saveReviews, validateChanges } from "@/lib/account-review";
import { getUserContext } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Who made the change. On SPCS the service runs as itself, so use the signed-in
 * viewer that Snowflake ingress passes in Sf-Context-Current-User. Locally, fall
 * back to the connected Snowflake user.
 */
async function resolveUpdatedBy(): Promise<string> {
  const viewer = (await headers()).get("sf-context-current-user")?.trim();
  if (viewer) return viewer.slice(0, 256);
  const ctx = await getUserContext().catch(() => null);
  return ctx?.displayName || ctx?.login || "unknown";
}

export async function GET() {
  try {
    return NextResponse.json({ reviews: await listReviews() }, { headers: NO_STORE });
  } catch (error) {
    console.error("[account-review] load failed", error);
    return NextResponse.json({ error: "Saved statuses could not be loaded." }, { status: 503, headers: NO_STORE });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers: NO_STORE });
  }
  try {
    const changes = validateChanges(body);
    const reviews = await saveReviews(changes, await resolveUpdatedBy());
    return NextResponse.json({ reviews }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof ReviewInputError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: NO_STORE });
    }
    console.error("[account-review] save failed", error);
    return NextResponse.json({ error: "Changes could not be saved." }, { status: 500, headers: NO_STORE });
  }
}
