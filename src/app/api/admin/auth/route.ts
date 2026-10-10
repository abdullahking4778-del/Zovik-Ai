import { NextRequest, NextResponse } from "next/server";
import {
  createAdminToken,
  verifyAdminRequest,
  getDynamicAdminPassword,
  safeVerifyPassword,
  checkAdminRateLimit,
  recordFailedAdminLogin,
  resetAdminRateLimit,
} from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const isValid = verifyAdminRequest(req);
  if (!isValid) {
    return NextResponse.json({ authenticated: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

export async function POST(req: NextRequest) {
  // Extract client IP for rate limiting
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "127.0.0.1").trim();

  // 1. Check Persistent Rate Limit
  const rateLimitStatus = checkAdminRateLimit(ip);
  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed login attempts. Locked out for security. Please try again in ${rateLimitStatus.retryAfterSec || 900} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitStatus.retryAfterSec || 900),
        },
      }
    );
  }

  try {
    let body: { password?: string; action?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
    }

    // Action: Logout
    if (body.action === "logout") {
      const response = NextResponse.json({ success: true, message: "Logged out successfully" });
      response.cookies.set("zovik_admin_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
      return response;
    }

    const { password } = body;
    if (!password || typeof password !== "string") {
      recordFailedAdminLogin(ip);
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const storedPassword = await getDynamicAdminPassword();

    // Secure failure if admin authentication not configured
    if (!storedPassword) {
      return NextResponse.json(
        { error: "Server Configuration Error: Admin password not initialized in environment." },
        { status: 500 }
      );
    }

    // 2. Constant-time secure password comparison (supporting salted scrypt hash)
    if (safeVerifyPassword(password, storedPassword)) {
      resetAdminRateLimit(ip);
      const token = createAdminToken();

      // Return success WITHOUT exposing the raw token in the response body
      const response = NextResponse.json({
        success: true,
        message: "Authenticated successfully.",
      });

      // Set server-managed HttpOnly, Secure, SameSite=Lax cookie
      response.cookies.set("zovik_admin_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60, // 24 hours
      });

      return response;
    }

    // 3. Failed Attempt
    const failRecord = recordFailedAdminLogin(ip);
    if (failRecord.locked) {
      return NextResponse.json(
        {
          error: "Maximum failed attempts exceeded. Access locked for 15 minutes.",
        },
        { status: 429 }
      );
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
