import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getAnalyticsOverview } from "@/lib/analyticsStore";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const overview = await getAnalyticsOverview();
    return NextResponse.json(
      {
        success: true,
        analytics: overview,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[Admin Analytics GET Error]:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error fetching analytics telemetry." },
      { status: 500 }
    );
  }
}
