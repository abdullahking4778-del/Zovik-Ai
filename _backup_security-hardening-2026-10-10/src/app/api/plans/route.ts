import { NextRequest, NextResponse } from "next/server";
import { getPersistentPlans } from "@/lib/plansStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/plans -> Public endpoint to fetch all active plans
export async function GET() {
  try {
    const allPlans = await getPersistentPlans();
    const activePlans = allPlans.filter((p) => p.isActive !== false);
    return NextResponse.json({
      success: true,
      plans: activePlans,
    });
  } catch (err: unknown) {
    console.error("[Plans GET Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to load plans" }, { status: 500 });
  }
}
