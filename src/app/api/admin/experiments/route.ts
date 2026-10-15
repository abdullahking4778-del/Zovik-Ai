import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getPersistentExperiments, updatePersistentExperiment } from "@/lib/analyticsStore";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const experiments = await getPersistentExperiments();
    return NextResponse.json(
      { success: true, experiments },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[Admin Experiments GET Error]:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error fetching A/B experiments." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, status, winner } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Experiment ID is required." },
        { status: 400 }
      );
    }

    const updated = await updatePersistentExperiment(id, {
      ...(status ? { status } : {}),
      ...(winner !== undefined ? { winner } : {}),
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Experiment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Experiment updated successfully.",
      experiment: updated,
    });
  } catch (err: unknown) {
    console.error("[Admin Experiments POST Error]:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error updating A/B experiment." },
      { status: 500 }
    );
  }
}
