import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getPersistentFeatureFlags,
  updatePersistentFeatureFlag,
} from "@/lib/featureFlagsStore";
import { FeatureFlag } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/feature-flags
 * Admin gets the complete list of system feature flags & kill-switches.
 */
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const flags = await getPersistentFeatureFlags();
    return NextResponse.json({
      success: true,
      flags,
      count: flags.length,
    });
  } catch (err: unknown) {
    console.error("[Admin Feature Flags GET Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/feature-flags
 * Admin updates or toggles a feature flag.
 */
export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const body: Partial<FeatureFlag> & { key?: string } = await req.json().catch(() => ({}));

    if (!body.key || !body.key.trim()) {
      return NextResponse.json(
        { success: false, error: "Feature flag key is required" },
        { status: 400 }
      );
    }

    const updated = await updatePersistentFeatureFlag(body.key.trim(), {
      enabled: body.enabled,
      rolloutPercentage: body.rolloutPercentage !== undefined ? Number(body.rolloutPercentage) : undefined,
      name: body.name?.trim(),
      description: body.description?.trim(),
      category: body.category,
    });

    return NextResponse.json({
      success: true,
      message: `Feature flag '${updated.key}' updated successfully.`,
      flag: updated,
    });
  } catch (err: unknown) {
    console.error("[Admin Feature Flags POST Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update feature flag" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/feature-flags
 * Fast toggle endpoint (e.g. { key: "maintenance_mode", enabled: true })
 */
export async function PATCH(req: NextRequest) {
  return POST(req);
}
