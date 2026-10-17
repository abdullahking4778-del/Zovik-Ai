import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { verifyAdminRequest } from "@/lib/adminAuth";
import { generateCsvExport, generateSystemBackupJson } from "@/lib/backupService";
import { recordAuditLog } from "@/lib/auditStore";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "full_backup";

    // Record Audit Log for export action
    await recordAuditLog({
      actorEmail: "owner@zovik.ai",
      actorRole: "super_admin",
      action: "BACKUP_EXPORTED",
      resourceType: "backup_export",
      details: `Generated and exported platform data archive: type '${type}'.`,
      severity: "warning",
    });

    if (type === "full_backup") {
      const backup = await generateSystemBackupJson();
      const filename = `zovik_full_backup_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;

      return new NextResponse(JSON.stringify(backup, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (type === "payments" || type === "users" || type === "audit_logs" || type === "offers") {
      const { filename, csv } = await generateCsvExport(type);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid export type requested." }, { status: 400 });
  } catch (err: unknown) {
    console.error("[Admin Governance Export GET Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error exporting platform data" }, { status: 500 });
  }
}
