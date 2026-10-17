import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { verifyAdminRequest } from "@/lib/adminAuth";
import { runFraudWatchdogScan, updateFraudAlertStatus } from "@/lib/fraudStore";
import { recordAuditLog } from "@/lib/auditStore";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const alerts = await runFraudWatchdogScan();
    return NextResponse.json(
      { success: true, alerts, total: alerts.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    console.error("[Admin Governance Fraud GET Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error running fraud scan" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "Alert ID and status are required." }, { status: 400 });
    }

    const updated = await updateFraudAlertStatus(id, status);

    if (!updated) {
      return NextResponse.json({ success: false, error: "Fraud alert not found." }, { status: 404 });
    }

    // Record Immutable Audit Log
    await recordAuditLog({
      actorEmail: "owner@zovik.ai",
      actorRole: "super_admin",
      action: "FRAUD_ACTION",
      resourceType: "fraud_alert",
      resourceId: id,
      details: `Updated fraud alert status to '${status}' for identifier '${updated.identifier}'.`,
      severity: status === "resolved" ? "info" : "warning",
    });

    return NextResponse.json({ success: true, alert: updated });
  } catch (err: unknown) {
    console.error("[Admin Governance Fraud POST Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error updating fraud alert" }, { status: 500 });
  }
}
