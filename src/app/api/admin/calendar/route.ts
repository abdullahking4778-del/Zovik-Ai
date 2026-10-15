import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getContentCalendarItems, detectCalendarConflicts } from "@/lib/analyticsStore";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const items = await getContentCalendarItems();
    const conflicts = detectCalendarConflicts(items);

    return NextResponse.json(
      {
        success: true,
        items,
        conflicts,
        totalItems: items.length,
        conflictsCount: conflicts.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[Admin Calendar GET Error]:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error fetching content calendar." },
      { status: 500 }
    );
  }
}
