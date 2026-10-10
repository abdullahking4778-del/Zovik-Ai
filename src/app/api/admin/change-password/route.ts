import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getDynamicAdminPassword, setDynamicAdminPassword, safeVerifyPassword } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminRequest(req)) {
      return NextResponse.json({ error: "Unauthorized access: Valid admin session required" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both current password and new password are required" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const activeStored = await getDynamicAdminPassword();

    if (!activeStored || !safeVerifyPassword(currentPassword, activeStored)) {
      return NextResponse.json(
        { error: "Incorrect current master password" },
        { status: 403 }
      );
    }

    // Authoritative persistence in Firestore & server storage with salted scrypt hash
    const saveSuccess = await setDynamicAdminPassword(newPassword);

    if (!saveSuccess) {
      return NextResponse.json(
        { error: "Failed to persist new password to storage. Password change was not applied." },
        { status: 500 }
      );
    }

    // Never return updatedPassword or secrets in the response
    return NextResponse.json({
      success: true,
      message: "Master Password successfully updated and securely hashed.",
    });
  } catch (err: unknown) {
    console.error("[Admin Change Password Error]:", err);
    return NextResponse.json({ error: "Internal server error updating password" }, { status: 500 });
  }
}
