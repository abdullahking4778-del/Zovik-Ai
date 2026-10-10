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
    // Fail-closed: Never accept unverified tokens without proper cryptographic verification
    return {
      authenticated: false,
      error: "Invalid, expired, or unverified authentication token.",
    };
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
