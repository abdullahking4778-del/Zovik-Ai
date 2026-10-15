import { NextRequest, NextResponse } from "next/server";
import { getSmartBannerConfig, getPromoModalConfig } from "@/lib/engagementStore";

export const dynamic = "force-dynamic";

/**
 * GET /api/engagement/banner
 * Returns the currently active smart banner and promo modal config for the frontend.
 */
export async function GET() {
  try {
    const [banner, promoModal] = await Promise.all([
      getSmartBannerConfig(),
      getPromoModalConfig(),
    ]);

    return NextResponse.json({
      success: true,
      banner,
      promoModal,
    });
  } catch (err: unknown) {
    console.error("[Engagement Banner GET Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch banner config" },
      { status: 500 }
    );
  }
}
