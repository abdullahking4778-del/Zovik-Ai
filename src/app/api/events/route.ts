import { NextRequest, NextResponse } from "next/server";
import { getActivePublicEvents } from "@/lib/eventsStore";
import { isFeatureEnabled } from "@/lib/featureFlagsStore";

export const dynamic = "force-dynamic";

/**
 * Public Events Endpoint
 * GET /api/events
 * Returns currently active & scheduled live events for users.
 */
export async function GET(req: NextRequest) {
  try {
    const isEventsEnabled = await isFeatureEnabled("events_system_enabled");
    if (!isEventsEnabled) {
      return NextResponse.json({
        success: true,
        events: [],
        systemDisabled: true,
      });
    }

    const { searchParams } = new URL(req.url);
    const tier = (searchParams.get("tier") || "free") as "free" | "plus" | "vip";

    const events = await getActivePublicEvents(tier);

    return NextResponse.json(
      {
        success: true,
        events,
        count: events.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[Events Public API Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve active events", events: [] },
      { status: 500 }
    );
  }
}
