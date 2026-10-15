import { NextRequest, NextResponse } from "next/server";
import { getPersistentNotifications } from "@/lib/engagementStore";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Public endpoint to fetch active notifications for user inbox / bell.
 * Optional query params:
 * ?audience=vip | free | all
 * ?user=email or uid (to mark read status)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const audienceParam = searchParams.get("audience") || "all";
    const userIdentifier = searchParams.get("user")?.trim().toLowerCase() || "";

    const allNotifs = await getPersistentNotifications();
    const now = Date.now();

    const activeList = allNotifs.filter((n) => {
      if (!n.isActive) return false;
      if (n.expiresAt) {
        const expTime = new Date(n.expiresAt).getTime();
        if (now > expTime) return false;
      }
      if (n.targetAudience !== "all" && n.targetAudience !== audienceParam) {
        return false;
      }
      return true;
    });

    const notifications = activeList.map((n) => {
      const isRead = userIdentifier && Array.isArray(n.readBy)
        ? n.readBy.includes(userIdentifier)
        : false;
      return {
        ...n,
        isRead,
      };
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err: unknown) {
    console.error("[Notifications GET Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
