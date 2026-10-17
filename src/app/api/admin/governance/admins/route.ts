import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getAllAdminUsers, saveAdminUser, deleteAdminUser } from "@/lib/adminRbacStore";
import { recordAuditLog } from "@/lib/auditStore";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const admins = await getAllAdminUsers();
    return NextResponse.json({ success: true, admins }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    console.error("[Admin Governance Admins GET Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error fetching admins" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email, name, role } = body;

    if (!email || !name || !role) {
      return NextResponse.json({ success: false, error: "Missing required fields: email, name, role." }, { status: 400 });
    }

    const saved = await saveAdminUser({
      id: body.id,
      email,
      name,
      role,
      status: body.status || "active",
      invitedBy: "owner@zovik.ai",
    });

    // Record Immutable Audit Log
    await recordAuditLog({
      actorEmail: "owner@zovik.ai",
      actorRole: "super_admin",
      action: body.id ? "ADMIN_ROLE_UPDATED" : "ADMIN_INVITED",
      resourceType: "admin",
      resourceId: saved.id,
      details: `Admin account '${saved.name}' (${saved.email}) saved with role '${saved.role}'.`,
      severity: "warning",
    });

    return NextResponse.json({ success: true, admin: saved });
  } catch (err: unknown) {
    console.error("[Admin Governance Admins POST Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error saving admin" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Admin ID is required." }, { status: 400 });
    }

    await deleteAdminUser(id);

    // Record Immutable Audit Log
    await recordAuditLog({
      actorEmail: "owner@zovik.ai",
      actorRole: "super_admin",
      action: "ADMIN_REMOVED",
      resourceType: "admin",
      resourceId: id,
      details: `Revoked access and deleted admin ID '${id}'.`,
      severity: "critical",
    });

    return NextResponse.json({ success: true, message: "Admin removed successfully." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove admin.";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
