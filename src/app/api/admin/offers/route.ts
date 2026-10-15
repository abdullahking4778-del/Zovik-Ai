import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getPersistentOffers,
  savePersistentOffer,
  deletePersistentOffer,
} from "@/lib/offersStore";
import { Offer } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/offers
 * Admin retrieves all configured promo codes, discounts and campaign offers.
 */
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const offers = await getPersistentOffers();
    return NextResponse.json({
      success: true,
      offers,
      count: offers.length,
    });
  } catch (err: unknown) {
    console.error("[Admin Offers GET Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch offers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/offers
 * Admin creates or updates an offer/promo code.
 */
export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const body: Partial<Offer> = await req.json().catch(() => ({}));

    if (!body.code || !body.code.trim()) {
      return NextResponse.json(
        { success: false, error: "Promo code (e.g. EID50) is required" },
        { status: 400 }
      );
    }

    if (body.discountValue === undefined || body.discountValue <= 0) {
      return NextResponse.json(
        { success: false, error: "Discount value must be greater than 0" },
        { status: 400 }
      );
    }

    const saved = await savePersistentOffer(body);

    return NextResponse.json({
      success: true,
      message: `Promo Code '${saved.code}' saved successfully!`,
      offer: saved,
    });
  } catch (err: unknown) {
    console.error("[Admin Offers POST Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to save promo code" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/offers?id=off_123
 * Admin deletes a promo code.
 */
export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Offer ID or code is required to delete" },
        { status: 400 }
      );
    }

    await deletePersistentOffer(id);

    return NextResponse.json({
      success: true,
      message: `Promo code '${id}' deleted successfully.`,
      deletedId: id,
    });
  } catch (err: unknown) {
    console.error("[Admin Offers DELETE Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete offer" },
      { status: 500 }
    );
  }
}
