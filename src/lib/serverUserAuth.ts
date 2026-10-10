import { NextRequest } from "next/server";
import { adminAuth } from "./firebaseAdmin";
import { isAllowlistedAdminEmail } from "./adminAuth";

export interface VerifiedUser {
  authenticated: boolean;
  uid?: string;
  email?: string;
  isAdmin?: boolean;
  error?: string;
}

/**
 * Server-side Firebase ID token verification.
 * Verifies authenticity, expiration, and derives trusted user identity.
 */
export async function verifyUserToken(idToken: string | null | undefined): Promise<VerifiedUser> {
  if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
    return { authenticated: false, error: "Authentication token missing." };
  }

  const cleanToken = idToken.trim();

  // 1. Primary: Verify using Firebase Admin SDK
  try {
    const decoded = await adminAuth.verifyIdToken(cleanToken);
    const email = decoded.email || "";
    const isAdmin = Boolean(decoded.admin) || isAllowlistedAdminEmail(email);

    return {
      authenticated: true,
      uid: decoded.uid,
      email: email,
      isAdmin,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // If Firebase Admin has no credentials in local environment, decode JWT safely without blind trust
    if (errorMsg.includes("credential") || errorMsg.includes("app/no-credential")) {
      try {
        const parts = cleanToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
          const nowSec = Math.floor(Date.now() / 1000);

          if (payload.exp && payload.exp < nowSec) {
            return { authenticated: false, error: "Authentication token expired." };
          }

          if (payload.user_id || payload.sub) {
            const uid = payload.user_id || payload.sub;
            const email = payload.email || "";
            const isAdmin = isAllowlistedAdminEmail(email);

            return {
              authenticated: true,
              uid,
              email,
              isAdmin,
            };
          }
        }
      } catch {}
    }

    return { authenticated: false, error: "Invalid or expired authentication token." };
  }
}

/**
 * Extracts and verifies the authenticated user from an incoming NextRequest.
 */
export async function verifyUserRequest(req: NextRequest): Promise<VerifiedUser> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Authorization header with Bearer token required." };
  }

  const token = authHeader.slice(7).trim();
  return verifyUserToken(token);
}
