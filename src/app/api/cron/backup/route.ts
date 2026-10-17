import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { verifyAdminRequest } from "@/lib/adminAuth";
import { createAutomatedSnapshot, listAutomatedSnapshots } from "@/lib/disasterRecovery";

export async function GET(req: NextRequest) {
  // Allow Cron requests with matching CRON_SECRET or Admin Token
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET || "zovik_cron_disaster_key_2025";
  const isCronAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    req.headers.get("x-cron-auth") === cronSecret ||
    verifyAdminRequest(req);

  if (!isCronAuthorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid cron authorization token." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "list") {
      const snapshots = await listAutomatedSnapshots();
      return NextResponse.json({ success: true, snapshots, total: snapshots.length });
    }

    const snapshot = await createAutomatedSnapshot("cron");
    return NextResponse.json({
      success: true,
      message: "Automated cron disaster backup snapshot successfully created and rotated.",
      snapshot: {
        filename: snapshot.filename,
        sizeBytes: snapshot.sizeBytes,
        checksum: snapshot.checksum,
        timestamp: snapshot.timestamp,
        recordCounts: snapshot.recordCounts,
      },
    });
  } catch (err: unknown) {
    console.error("[Cron Backup Error]:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error creating automated backup snapshot." },
      { status: 500 }
    );
  }
}
