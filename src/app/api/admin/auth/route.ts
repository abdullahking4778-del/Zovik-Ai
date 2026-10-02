import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, verifyAdminRequest, getDynamicAdminPassword } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const isValid = verifyAdminRequest(req);
  if (!isValid) {
    return NextResponse.json({ authenticated: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const correctPassword = await getDynamicAdminPassword();

    if (!correctPassword) {
      return NextResponse.json(
        { error: "Server Configuration Error: Admin password not initialized." },
        { status: 500 }
      );
    }

    if (password === correctPassword) {
      const token = createAdminToken();
      return NextResponse.json({
        success: true,
        token,
      });
    }

    return NextResponse.json(
      { error: "Invalid Master Password! Access Denied." },
      { status: 401 }
    );
  } catch (error: unknown) {
    console.error("[Admin Auth POST Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
