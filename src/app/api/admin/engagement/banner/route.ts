import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getSmartBannerConfig,
  saveSmartBannerConfig,
  getPromoModalConfig,
  savePromoModalConfig,
} from "@/lib/engagementStore";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/engagement/banner -> Load current banner & promo modal settings
 */
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const [banner, promoModal] = await Promise.all([
      getSmartBannerConfig(),
      getPromoModalConfig(),
    ]);

    return NextResponse.json({ success: true, banner, promoModal });
  } catch (err: unknown) {
    console.error("[Admin Engagement GET Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to load engagement settings" }, { status: 500 });
  }
}

/**
 * POST /api/admin/engagement/banner -> Update banner and/or promo modal settings
 */
export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { banner, promoModal } = body;

    let updatedBanner = null;
    let updatedPromoModal = null;

    if (banner && typeof banner === "object") {
      updatedBanner = await saveSmartBannerConfig(banner);
    }

    if (promoModal && typeof promoModal === "object") {
      updatedPromoModal = await savePromoModalConfig(promoModal);
    }

    return NextResponse.json({
      success: true,
      banner: updatedBanner,
      promoModal: updatedPromoModal,
      message: "Engagement settings updated successfully",
    });
  } catch (err: unknown) {
    console.error("[Admin Engagement POST Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to save engagement settings" }, { status: 500 });
  }
}
