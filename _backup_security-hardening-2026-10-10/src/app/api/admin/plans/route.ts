import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getPersistentPlans,
  savePersistentPlan,
  deletePersistentPlan,
} from "@/lib/plansStore";
import { PricingPlan } from "@/types";

// GET /api/admin/plans -> Admin retrieves all plans (including inactive)
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const plans = await getPersistentPlans();
    return NextResponse.json({ success: true, plans });
  } catch (err: unknown) {
    console.error("[Admin Plans GET Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch plans" }, { status: 500 });
  }
}

// POST /api/admin/plans -> Admin creates or updates a plan
export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const body: Partial<PricingPlan> = await req.json().catch(() => ({}));
    if (!body.name || !body.pricePKR) {
      return NextResponse.json(
        { success: false, error: "Plan name and PKR price are required" },
        { status: 400 }
      );
    }

    const planId = (body.id || body.name.toLowerCase().replace(/[^a-z0-9]/g, "_")).trim();

    const planToSave: PricingPlan = {
      id: planId,
      name: body.name.trim(),
      badge: body.badge?.trim() || undefined,
      badgeColor: body.badgeColor || "orange",
      pricePKR: Number(body.pricePKR) || 1500,
      originalPricePKR: Number(body.originalPricePKR) || Number(body.pricePKR) * 2,
      priceUSD: Number(body.priceUSD) || Math.round((Number(body.pricePKR) / 280) * 10) / 10 || 5,
      originalPriceUSD: Number(body.originalPriceUSD) || 16.99,
      durationDays: Number(body.durationDays) || 30,
      features: Array.isArray(body.features) && body.features.length > 0
        ? body.features
        : [
            "Unlimited Messages & Voice",
            "HD Photos Unlocked",
            "18+ Uncensored Chat",
            "Cloud Storage Retention",
          ],
      isPopular: Boolean(body.isPopular),
      isActive: body.isActive !== false,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await savePersistentPlan(planToSave);

    return NextResponse.json({
      success: true,
      message: `Plan '${saved.name}' saved successfully.`,
      plan: saved,
    });
  } catch (err: unknown) {
    console.error("[Admin Plans POST Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to save plan" }, { status: 500 });
  }
}

// DELETE /api/admin/plans?id=planId -> Admin deletes a plan
export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("id");

    if (!planId) {
      return NextResponse.json({ success: false, error: "Plan ID is required to delete" }, { status: 400 });
    }

    await deletePersistentPlan(planId);

    return NextResponse.json({
      success: true,
      message: `Plan '${planId}' deleted successfully.`,
      deletedId: planId,
    });
  } catch (err: unknown) {
    console.error("[Admin Plans DELETE Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to delete plan" }, { status: 500 });
  }
}
