import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyAdminRequest, getDynamicAdminPassword, setDynamicAdminPassword } from "@/lib/adminAuth";

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

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const activePassword = await getDynamicAdminPassword();

    if (!activePassword || !safeVerifyPassword(currentPassword, activePassword)) {
      return NextResponse.json(
        { error: "Incorrect current master password" },
        { status: 403 }
      );
    }

    // 1. Authoritative persistence in Firestore & process memory
    await setDynamicAdminPassword(newPassword);

    // 2. Local development best-effort sync only (never crashes on Vercel read-only disk)
    if (!process.env.VERCEL) {
      try {
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
      } catch (localErr) {
        console.warn("[Admin Change Password] Local .env.local write skipped (Safe for Cloud/Serverless):", localErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Master Password successfully updated! It is now permanently active.",
      updatedPassword: newPassword,
    });
  } catch (err: unknown) {
    console.error("[Admin Change Password Error]:", err);
    return NextResponse.json({ error: "Internal server error updating password" }, { status: 500 });
  }
}
