import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getPersistentEvents,
  savePersistentEvent,
  deletePersistentEvent,
} from "@/lib/eventsStore";
import { AppEvent } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/events
 * Admin retrieves all configured events (draft, scheduled, live, ended).
 */
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const events = await getPersistentEvents();
    return NextResponse.json({
      success: true,
      events,
      totalCount: events.length,
    });
  } catch (err: unknown) {
    console.error("[Admin Events GET Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch events list" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/events
 * Admin creates or updates an event.
 */
export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const body: Partial<AppEvent> = await req.json().catch(() => ({}));

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { success: false, error: "Event title is strictly required" },
        { status: 400 }
      );
    }

    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: "Both start date and end date are required" },
        { status: 400 }
      );
    }

    const saved = await savePersistentEvent(body);

    return NextResponse.json({
      success: true,
      message: `Event '${saved.title}' saved successfully.`,
      event: saved,
    });
  } catch (err: unknown) {
    console.error("[Admin Events POST Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to save event" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/events?id=evt_123
 * Admin deletes an event.
 */
export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Event ID is required to delete" },
        { status: 400 }
      );
    }

    await deletePersistentEvent(eventId);

    return NextResponse.json({
      success: true,
      message: `Event '${eventId}' deleted successfully.`,
      deletedId: eventId,
    });
  } catch (err: unknown) {
    console.error("[Admin Events DELETE Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
