import { NextRequest, NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/engagementStore";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/read
 * Marks a notification as read for a given user identifier.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, user } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ success: false, error: "Notification ID is required" }, { status: 400 });
    }

    const userToUse = (user && typeof user === "string" ? user : "anonymous").trim().toLowerCase();
    const ok = await markNotificationRead(id, userToUse);

    return NextResponse.json({ success: ok });
  } catch (err: unknown) {
    console.error("[Notifications Read Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to mark as read" }, { status: 500 });
  }
}
