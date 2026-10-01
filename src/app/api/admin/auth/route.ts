import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, verifyAdminRequest, getAdminPassword } from "@/lib/adminAuth";

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
    const correctPassword = getAdminPassword();

    if (!correctPassword) {
      return NextResponse.json(
        { error: "Server Configuration Error: ADMIN_PASSWORD is not set." },
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
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
  }
}
