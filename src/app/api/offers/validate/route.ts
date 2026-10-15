import { NextRequest, NextResponse } from "next/server";
import { validateOfferCode } from "@/lib/offersStore";

export const dynamic = "force-dynamic";

/**
 * POST /api/offers/validate
 * Public checkout endpoint to validate promo codes in real-time.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, amountPKR, userEmail, userTier } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "Promo code is required" },
        { status: 400 }
      );
    }

    const numAmount = Number(amountPKR) || 0;
    const result = await validateOfferCode(code, numAmount, userEmail, userTier);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[Offers Validate API Error]:", err);
    return NextResponse.json(
      { valid: false, error: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
