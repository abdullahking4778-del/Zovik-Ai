import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { removeDeletedUserTombstone } from "@/lib/deletedUsers";

/**
 * POST /api/user/unmark-deleted
 * Restricted strictly to authorized administrators.
 * Prevents deleted users from circumventing administrator blocks on normal logins.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Enforce admin-only authorization
    const isAdmin = verifyAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can unmark or restore a deleted account." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const targetId = (body.userId || body.id || "").trim();
    const targetEmail = (body.email || "").trim().toLowerCase();

    if (!targetId && !targetEmail) {
      return NextResponse.json(
        { error: "Missing target userId or email in request body." },
        { status: 400 }
      );
    }

    const result = await removeDeletedUserTombstone(targetId, targetEmail);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to remove tombstone record from authoritative cloud storage.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User block successfully lifted for ${targetEmail || targetId}.`,
    });
  } catch (err: unknown) {
    console.error("[UnmarkDeleted POST Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
