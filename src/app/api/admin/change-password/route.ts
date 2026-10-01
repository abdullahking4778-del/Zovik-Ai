import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyAdminRequest, getAdminPassword } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminRequest(req)) {
      return NextResponse.json({ error: "Unauthorized access: Valid admin token required" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both current password and new password are required" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const activePassword = getAdminPassword() || process.env.ADMIN_PASSWORD || "#Abdullah786099#";

    if (currentPassword !== activePassword) {
      return NextResponse.json(
        { error: "Incorrect current master password" },
        { status: 403 }
      );
    }

    // Update in-memory process.env
    process.env.ADMIN_PASSWORD = newPassword;

    // Atomically write to .env.local
    const envPath = path.join(process.cwd(), ".env.local");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    const regex = /^ADMIN_PASSWORD=.*$/m;
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `ADMIN_PASSWORD="${newPassword}"`);
    } else {
      envContent = envContent ? `${envContent}\nADMIN_PASSWORD="${newPassword}"` : `ADMIN_PASSWORD="${newPassword}"\n`;
    }

    fs.writeFileSync(envPath, envContent, "utf-8");

    return NextResponse.json({
      success: true,
      message: "Master Password successfully updated! It is now active.",
      updatedPassword: newPassword,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update password";
    console.error("Error updating master password:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
