import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getPersistentAnnouncement, savePersistentAnnouncement } from "@/lib/announcementStore";
import { AnnouncementConfig } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const announcement = getPersistentAnnouncement();
  return NextResponse.json({ success: true, announcement });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: Partial<AnnouncementConfig> = await req.json();
    const updated = savePersistentAnnouncement(body);
    return NextResponse.json({ success: true, announcement: updated, message: "Announcement updated successfully" });
  } catch (err: unknown) {
    console.error("[Admin Announcement Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to update announcement" }, { status: 500 });
  }
}
