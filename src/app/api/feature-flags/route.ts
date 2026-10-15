import { NextResponse } from "next/server";
import { getPublicFeatureFlags } from "@/lib/featureFlagsStore";

export const dynamic = "force-dynamic";

/**
 * Public Feature Flags Endpoint
 * GET /api/feature-flags
 * Returns a fast key-value dictionary of active feature flags for clients.
 */
export async function GET() {
  try {
    const flags = await getPublicFeatureFlags();

    return NextResponse.json(
      {
        success: true,
        flags,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[Public Feature Flags API Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load feature flags", flags: {} },
      { status: 500 }
    );
  }
}
