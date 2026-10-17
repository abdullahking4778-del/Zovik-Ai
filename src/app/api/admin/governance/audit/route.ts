import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getAuditLogs } from "@/lib/auditStore";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const actor = searchParams.get("actor") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const logs = await getAuditLogs({ action, severity, actor, limit });
    return NextResponse.json(
      { success: true, logs, total: logs.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    console.error("[Admin Governance Audit GET Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error fetching audit logs" }, { status: 500 });
  }
}
