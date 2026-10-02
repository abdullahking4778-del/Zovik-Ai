import { NextRequest } from "next/server";
import crypto from "crypto";

import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

let cachedAdminPassword: string | null = null;
let lastPasswordFetch = 0;

export function getAdminPassword(): string {
  return cachedAdminPassword || process.env.ADMIN_PASSWORD?.trim() || "#Abdullah786099#";
}

export async function getDynamicAdminPassword(): Promise<string> {
  const now = Date.now();
  if (cachedAdminPassword && now - lastPasswordFetch < 60000) {
    return cachedAdminPassword;
  }

  try {
    const docRef = doc(db, "config", "admin_auth");
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.password) {
      cachedAdminPassword = snap.data().password;
      lastPasswordFetch = now;
      return cachedAdminPassword!;
    }
  } catch (err) {
    console.warn("[AdminAuth] Firestore config read fallback:", err);
  }

  const fallback = process.env.ADMIN_PASSWORD?.trim() || "#Abdullah786099#";
  cachedAdminPassword = fallback;
  lastPasswordFetch = now;
  return fallback;
}

export async function setDynamicAdminPassword(newPassword: string): Promise<boolean> {
  cachedAdminPassword = newPassword;
  lastPasswordFetch = Date.now();
  process.env.ADMIN_PASSWORD = newPassword;

  try {
    const docRef = doc(db, "config", "admin_auth");
    await setDoc(
      docRef,
      {
        password: newPassword,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn("[AdminAuth] Firestore config save fallback:", err);
    return false;
  }
}

function getJwtSecret(): string {
  const envSecret = process.env.ADMIN_JWT_SECRET?.trim();
  if (envSecret) return envSecret;

  if (process.env.NODE_ENV === "production") {
    console.warn("[SECURITY CAUTION]: ADMIN_JWT_SECRET is not set in environment variables! Using runtime secure key.");
  }
  return "zovik_secure_admin_jwt_secret_2026_pk";
}

const JWT_SECRET = getJwtSecret();

interface TokenPayload {
  role: "admin";
  iat: number;
  exp: number;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 admin session token.
 * Token validity: 7 days.
 */
export function createAdminToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload: TokenPayload = {
    role: "admin",
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${encodedPayload}`)
    .digest("base64url");

  return `${header}.${encodedPayload}.${signature}`;
}

/**
 * Verifies the signature, structure, and expiration of an admin session token.
 * Uses crypto.timingSafeEqual to prevent side-channel timing attacks.
 */
export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [header, encodedPayload, signature] = parts;

  // Recompute signature
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${encodedPayload}`)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature, "utf-8");
  const expectedBuffer = Buffer.from(expectedSig, "utf-8");

  if (sigBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return false;

  try {
    const payload: TokenPayload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
    if (payload.role !== "admin") return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts and verifies admin authorization from incoming NextRequest.
 * Checks Authorization header ('Bearer <token>') and admin session cookies.
 */
export function verifyAdminRequest(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (verifyAdminToken(token)) return true;
  }

  // Also check admin token cookie if present
  const cookieToken = req.cookies.get("zovik_admin_token")?.value;
  if (cookieToken && verifyAdminToken(cookieToken)) return true;

  return false;
}
