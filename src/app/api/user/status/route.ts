import { NextRequest, NextResponse } from "next/server";
import { getActiveUserTier, findStoredUser } from "@/lib/userStore";
import { verifyUserRequest } from "@/lib/serverUserAuth";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isUserDeleted } from "@/lib/deletedUsers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/user/status
 * Secure, strictly read-only endpoint.
 * Requires verified user token or admin session.
 * Regular users can ONLY inspect their own account status.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetEmail = (searchParams.get("email") || "").trim().toLowerCase();
  const targetUid = (searchParams.get("uid") || "").trim();

  // 1. Check if caller is Admin
  const isAdmin = verifyAdminRequest(req);

  // 2. Check caller's verified user identity
  const verifiedUser = await verifyUserRequest(req);

  // Unauthenticated requests are rejected
  if (!isAdmin && !verifiedUser.authenticated) {
    return NextResponse.json(
      { error: "Unauthorized: Valid authentication token required to inspect status." },
      { status: 401 }
    );
  }

  // 3. Authorization check (IDOR Prevention)
  // Non-admins can ONLY read their own status derived from their verified token
  let effectiveEmail = verifiedUser.email?.toLowerCase() || "";
  let effectiveUid = verifiedUser.uid || "";

  if (isAdmin) {
    // Admins can query any target user
    if (targetEmail) effectiveEmail = targetEmail;
    if (targetUid) effectiveUid = targetUid;
  } else {
    // If ordinary user tried to pass a different email or uid, reject with 403 Forbidden
    if (
      (targetEmail && targetEmail !== effectiveEmail) ||
      (targetUid && targetUid !== effectiveUid)
    ) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to access another user's status." },
        { status: 403 }
      );
    }
  }

  if (!effectiveEmail && !effectiveUid) {
    return NextResponse.json(
      { error: "No user identity found in verified token." },
      { status: 400 }
    );
  }

  // Check if user has been permanently deleted by administrator
  if (isUserDeleted(effectiveUid, effectiveEmail)) {
    return NextResponse.json(
      { success: false, deleted: true, error: "Account permanently deleted by administrator." },
      { status: 410 }
    );
  }

  // 4. Purely Read-only lookup (NO mutations, NO upserts in GET)
  const storedUser = (effectiveEmail ? findStoredUser(effectiveEmail) : null) ||
                     (effectiveUid ? findStoredUser(effectiveUid) : null);

  if (storedUser) {
    const status = getActiveUserTier(storedUser.id || storedUser.email);
    return NextResponse.json({
      success: true,
      tier: status.tier,
      isVip: status.isVip,
      subscriptionEndsAt: status.subscriptionEndsAt,
      storageRetentionDays: status.storageRetentionDays,
    });
  }

  // Default free tier if user record does not exist yet (strictly read-only)
  return NextResponse.json({
    success: true,
    tier: "free",
    isVip: false,
    subscriptionEndsAt: null,
    storageRetentionDays: 7,
  });
}
