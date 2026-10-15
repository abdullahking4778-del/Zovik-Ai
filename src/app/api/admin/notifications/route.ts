import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getPersistentNotifications,
  savePersistentNotification,
  deletePersistentNotification,
} from "@/lib/engagementStore";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/notifications -> List all notifications
 */
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const notifications = await getPersistentNotifications();
    return NextResponse.json({ success: true, notifications });
  } catch (err: unknown) {
    console.error("[Admin Notifications GET Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to load notifications" }, { status: 500 });
  }
}

/**
 * POST /api/admin/notifications -> Create or update notification
 */
export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (!body.title || !body.message) {
      return NextResponse.json({ success: false, error: "Title and message are required" }, { status: 400 });
    }

    const saved = await savePersistentNotification(body);
    return NextResponse.json({ success: true, notification: saved });
  } catch (err: unknown) {
    console.error("[Admin Notifications POST Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to save notification" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/notifications?id=... -> Delete notification
 */
export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Notification ID is required" }, { status: 400 });
    }

    await deletePersistentNotification(id);
    return NextResponse.json({ success: true, message: "Notification deleted" });
  } catch (err: unknown) {
    console.error("[Admin Notifications DELETE Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to delete notification" }, { status: 500 });
  }
}
