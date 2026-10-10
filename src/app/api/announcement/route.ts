import { NextResponse } from "next/server";
import { getPersistentAnnouncement } from "@/lib/announcementStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const announcement = getPersistentAnnouncement();
    return NextResponse.json({ success: true, announcement }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      }
    });
  } catch (err: unknown) {
    console.error("[Announcement GET Error]:", err);
    return NextResponse.json(
      {
        success: true,
        announcement: {
          enabled: false,
          text: "",
        },
      },
      { status: 200 }
    );
  }
}
