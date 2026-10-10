import { NextRequest, NextResponse } from "next/server";
import {
  createAdminToken,
  verifyAdminRequest,
  getDynamicAdminPassword,
  safeVerifyPassword,
  checkAdminRateLimit,
  recordFailedAdminLogin,
  resetAdminRateLimit,
  extractClientIp,
} from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const isValid = verifyAdminRequest(req);
  if (!isValid) {
    return NextResponse.json({ authenticated: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

export async function POST(req: NextRequest) {
  let body: { password?: string; action?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
  }

  // 1. Action: Logout (MUST NOT be blocked by login throttling)
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

  // Extract trusted client IP for rate limiting
  const ip = extractClientIp(req);

  // 2. Check Rate Limit for login attempts
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

    // 3. Constant-time secure password comparison (supporting salted scrypt hash)
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

    // 4. Failed Attempt
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
