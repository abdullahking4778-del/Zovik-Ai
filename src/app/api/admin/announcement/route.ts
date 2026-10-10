import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getPersistentAnnouncementAsync, savePersistentAnnouncementAsync } from "@/lib/announcementStore";
import { AnnouncementConfig } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const announcement = await getPersistentAnnouncementAsync();
  return NextResponse.json({ success: true, announcement });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: Partial<AnnouncementConfig> = await req.json();
    const result = await savePersistentAnnouncementAsync(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to persist announcement to cloud database",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      announcement: result.announcement,
      cloudSaved: result.cloudSaved,
      message: "Announcement updated and durably persisted.",
    });
  } catch (err: unknown) {
    console.error("[Admin Announcement Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to update announcement" }, { status: 500 });
  }
}
