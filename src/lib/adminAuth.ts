import { NextRequest } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { adminDb, adminFieldValue } from "./firebaseAdmin";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

let cachedAdminPasswordHash: string | null = null;
let lastPasswordFetch = 0;

// Rate limiting configuration
interface LoginAttempt {
  count: number;
  lockedUntil: number;
  lastAttempt: number;
}
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

// In-memory rate limits cache for fastest atomic increments
const inMemoryRateLimits: Record<string, LoginAttempt> = {};

/**
 * File path for local / container rate limits cache.
 * Note on serverless: On platforms like Vercel, /tmp is container-local.
 * It provides effective per-instance throttling without requiring paid external Redis services.
 */
function getRateLimitsFilePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_admin_rate_limits.json");
  }
  return path.join(process.cwd(), ".data", "admin_rate_limits.json");
}

function readPersistentRateLimits(): Record<string, LoginAttempt> {
  try {
    const filePath = getRateLimitsFilePath();
    if (!fs.existsSync(filePath)) return inMemoryRateLimits;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw.trim()) return inMemoryRateLimits;
    const fromDisk = JSON.parse(raw);
    return { ...inMemoryRateLimits, ...fromDisk };
  } catch {
    return inMemoryRateLimits;
  }
}

function writePersistentRateLimits(data: Record<string, LoginAttempt>): void {
  try {
    Object.assign(inMemoryRateLimits, data);
    const filePath = getRateLimitsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

/**
 * Clears rate limits — for isolated testing environments only.
 */
export function clearAdminRateLimitsForTesting(): void {
  for (const k of Object.keys(inMemoryRateLimits)) {
    delete inMemoryRateLimits[k];
  }
  try {
    const filePath = getRateLimitsFilePath();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

function hashClientIp(ip: string): string {
  return crypto.createHash("sha256").update(ip || "127.0.0.1").digest("hex").slice(0, 32);
}

/**
 * Extracts trusted client IP from request headers.
 * Prioritizes trusted hosting platform headers (Vercel edge verified) over arbitrary client-supplied headers.
 */
export function extractClientIp(req: NextRequest): string {
  // 1. Trusted Vercel Edge verified client IP
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp && vercelIp.trim()) {
    return vercelIp.split(",")[0].trim();
  }

  // 2. Real IP header provided by reverse proxy
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  // 3. Rightmost IP or first proxy in standard forwarded header
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim()) {
    const ips = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    return ips[0] || "127.0.0.1";
  }

  return "127.0.0.1";
}

/**
 * Check if an IP is currently rate-limited.
 */
export function checkAdminRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; retryAfterSec?: number } {
  const now = Date.now();
  const key = hashClientIp(ip);
  const limits = readPersistentRateLimits();
  const record = limits[key];

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // If currently locked out
  if (record.lockedUntil > now) {
    const retryAfterSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSec };
  }

  // Reset if window has expired
  if (now - record.lastAttempt > LOCKOUT_MS) {
    delete limits[key];
    delete inMemoryRateLimits[key];
    writePersistentRateLimits(limits);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

/**
 * Record a failed admin login attempt.
 */
export function recordFailedAdminLogin(ip: string): { locked: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const key = hashClientIp(ip);
  const limits = readPersistentRateLimits();
  const record = limits[key] || { count: 0, lockedUntil: 0, lastAttempt: now };

  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    limits[key] = record;
    writePersistentRateLimits(limits);
    return { locked: true, retryAfterSec: Math.ceil(LOCKOUT_MS / 1000) };
  }

  limits[key] = record;
  writePersistentRateLimits(limits);
  return { locked: false };
}

/**
 * Reset failed attempts on successful login.
 */
export function resetAdminRateLimit(ip: string): void {
  const key = hashClientIp(ip);
  const limits = readPersistentRateLimits();
  if (limits[key]) {
    delete limits[key];
    delete inMemoryRateLimits[key];
    writePersistentRateLimits(limits);
  }
}

/**
 * Hashes a password using crypto.scrypt with a unique random 16-byte salt.
 * Standard format: scrypt$<salt>$<hash>
 */
export function hashAdminPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

/**
 * Constant-time password verification supporting scrypt salted hashes.
 */
export function safeVerifyPassword(candidate: string, stored: string): boolean {
  if (!candidate || !stored) return false;

  // Modern salted scrypt hash
  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedHex = parts[2];
    const derived = crypto.scryptSync(candidate, salt, 64);
    const expectedBuf = Buffer.from(expectedHex, "hex");
    if (derived.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(derived, expectedBuf);
  }

  // Transition legacy comparison (constant-time SHA-256)
  const hashCandidate = crypto.createHash("sha256").update(candidate).digest();
  const hashStored = crypto.createHash("sha256").update(stored).digest();
  return crypto.timingSafeEqual(hashCandidate, hashStored);
}

/**
 * Retrieves the stored password hash (or initial password to be verified).
 * Fails securely if no environment variable or database password is configured.
 * Never stores or returns plain-text passwords once updated.
 * Migrates legacy plaintext password storage safely without leaking secrets.
 */
export async function getDynamicAdminPassword(): Promise<string | null> {
  const now = Date.now();
  if (cachedAdminPasswordHash && now - lastPasswordFetch < 60000) {
    return cachedAdminPasswordHash;
  }

  // 1. Check server environment for hash or password
  let envVal = process.env.ADMIN_PASSWORD_HASH?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (!envVal) {
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, "utf-8");
        const matchHash = raw.match(/^ADMIN_PASSWORD_HASH=["']?([^"'\r\n]+)["']?/m);
        if (matchHash && matchHash[1]) {
          envVal = matchHash[1].trim();
        } else {
          const matchPass = raw.match(/^ADMIN_PASSWORD=["']?([^"'\r\n]+)["']?/m);
          if (matchPass && matchPass[1]) {
            envVal = matchPass[1].trim();
          }
        }
      }
    } catch {}
  }

  // 2. Check Firestore config via Firebase Admin SDK (authoritative)
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docRef = adminDb.collection("config").doc("admin_auth");
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data();
        if (data?.passwordHash) {
          // If a legacy plaintext password field still lingers alongside passwordHash, safely remove it
          if (data?.password) {
            try {
              await docRef.update({
                password: adminFieldValue.delete(),
              });
            } catch {}
          }
          cachedAdminPasswordHash = data.passwordHash;
          lastPasswordFetch = now;
          return cachedAdminPasswordHash;
        }

        // Legacy plaintext password found: migrate safely
        if (data?.password && typeof data.password === "string") {
          const plainLegacy = data.password;
          const newHash = hashAdminPassword(plainLegacy);

          // Verify hash before removing legacy field
          if (safeVerifyPassword(plainLegacy, newHash)) {
            try {
              await docRef.set(
                {
                  passwordHash: newHash,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
              // Only remove legacy plaintext after confirmed save
              await docRef.update({
                password: adminFieldValue.delete(),
              }).catch(() => {});

              cachedAdminPasswordHash = newHash;
              lastPasswordFetch = now;
              return newHash;
            } catch (migErr) {
              console.warn("[AdminAuth] Legacy migration save note:", migErr);
            }
          }

          cachedAdminPasswordHash = plainLegacy;
          lastPasswordFetch = now;
          return plainLegacy;
        }
      }
    }
  } catch (err) {
    console.warn("[AdminAuth] Firestore config read warning:", err);
  }

  // 3. Check Supabase (if configured)
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "admin_password_hash")
        .maybeSingle();
      if (data?.value) {
        cachedAdminPasswordHash = data.value;
        lastPasswordFetch = now;
        return data.value;
      }
    } catch {}
  }

  if (envVal) {
    cachedAdminPasswordHash = envVal;
    lastPasswordFetch = now;
    return envVal;
  }

  return null;
}

/**
 * Dynamically updates admin password using salted scrypt hash.
 * Returns true ONLY if durable persistence succeeded.
 * On Vercel, does not treat local .data writes as permanent storage.
 */
export async function setDynamicAdminPassword(newPassword: string): Promise<boolean> {
  if (!newPassword || newPassword.length < 8) {
    return false;
  }

  const passwordHash = hashAdminPassword(newPassword);
  cachedAdminPasswordHash = passwordHash;
  lastPasswordFetch = Date.now();
  process.env.ADMIN_PASSWORD_HASH = passwordHash;
  delete process.env.ADMIN_PASSWORD;

  let firestoreSaved = false;
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docRef = adminDb.collection("config").doc("admin_auth");
      await docRef.set(
        {
          passwordHash,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      // Remove any lingering legacy password field
      try {
        await docRef.update({
          password: adminFieldValue.delete(),
        });
      } catch {}
      firestoreSaved = true;
    }
  } catch (err) {
    console.warn("[AdminAuth] Firestore config save warning:", err);
  }

  // Supabase cloud database sync
  let supabaseSaved = false;
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseAdmin.from("app_settings").upsert({
        key: "admin_password_hash",
        value: passwordHash,
        updated_at: new Date().toISOString(),
      });
      if (!error) supabaseSaved = true;
    } catch {}
  }

  // Persistent server storage for non-serverless container environments
  let localSaved = false;
  try {
    const dataDir = path.join(process.cwd(), ".data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const authFile = path.join(dataDir, "admin_auth.json");
    fs.writeFileSync(authFile, JSON.stringify({ passwordHash, updatedAt: new Date().toISOString() }, null, 2), "utf-8");
    localSaved = true;
  } catch {}

  // Local development .env.local sync
  if (!process.env.VERCEL) {
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      const regexHash = /^ADMIN_PASSWORD_HASH=.*$/m;
      if (regexHash.test(envContent)) {
        envContent = envContent.replace(regexHash, `ADMIN_PASSWORD_HASH="${passwordHash}"`);
      } else {
        envContent = `${envContent}\nADMIN_PASSWORD_HASH="${passwordHash}"`;
      }
      envContent = envContent.replace(/^ADMIN_PASSWORD=.*$/m, "");
      fs.writeFileSync(envPath, envContent.trim() + "\n", "utf-8");
      localSaved = true;
    } catch {}
  }

  // On Vercel, local file writes are ephemeral.
  // We must return true ONLY if durable cloud storage confirms the save!
  if (process.env.VERCEL) {
    return firestoreSaved || supabaseSaved;
  }

  return firestoreSaved || supabaseSaved || localSaved;
}

/**
 * Retrieves the required server-only JWT secret.
 * FAILS SECURELY if missing or weak (minimum 24 characters required).
 * NO PREDICTABLE FALLBACKS.
 */
function getJwtSecret(): string {
  let secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!secret) {
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, "utf-8");
        const match = raw.match(/^ADMIN_JWT_SECRET=["']?([^"'\r\n]+)["']?/m);
        if (match && match[1]) {
          secret = match[1].trim();
        }
      }
    } catch {}
  }

  if (!secret || secret.length < 24) {
    throw new Error(
      "[AdminAuth Security Failure]: ADMIN_JWT_SECRET is missing or too short. A strong server-only secret (>= 24 chars) is strictly required."
    );
  }

  return secret;
}

interface TokenPayload {
  role: "admin";
  iat: number;
  exp: number;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 admin session token.
 * Token validity: 24 hours. Fails securely if secret is unconfigured.
 */
export function createAdminToken(): string {
  const secret = getJwtSecret();
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload: TokenPayload = {
    role: "admin",
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
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

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    return false; // Fail securely
  }

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [header, encodedPayload, signature] = parts;

  const expectedSig = crypto
    .createHmac("sha256", secret)
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
 * Server-only administrator allowlist verification.
 */
export function isAllowlistedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
  const allowlist = adminEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.trim().toLowerCase());
}

/**
 * Extracts and verifies admin authorization from incoming NextRequest.
 * Verifies Authorization header or HttpOnly session cookie.
 * For mutating requests (POST, PUT, DELETE, PATCH) authenticated via cookie,
 * enforces CSRF protection by validating custom header or origin/referer.
 */
export function verifyAdminRequest(req: NextRequest): boolean {
  let isAuthorized = false;
  let isCookieAuth = false;

  // 1. Check Authorization header
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (verifyAdminToken(token)) {
      isAuthorized = true;
    }
  }

  // 2. Check HttpOnly cookie
  if (!isAuthorized) {
    const cookieSession =
      req.cookies?.get?.("zovik_admin_session")?.value ||
      req.cookies?.get?.("zovik_admin_token")?.value;

    if (cookieSession && verifyAdminToken(cookieSession)) {
      isAuthorized = true;
      isCookieAuth = true;
    }
  }

  if (!isAuthorized) {
    return false;
  }

  // 3. CSRF Protection for state-changing HTTP methods when authenticated via cookie
  const mutatingMethods = ["POST", "PUT", "DELETE", "PATCH"];
  if (isCookieAuth && mutatingMethods.includes(req.method.toUpperCase())) {
    const customHeader = req.headers.get("x-zovik-admin-request");
    if (customHeader === "1") {
      return true;
    }

    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    const host = req.headers.get("host");

    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost === host) return true;
      } catch {}
    }

    if (referer && host) {
      try {
        const refererHost = new URL(referer).host;
        if (refererHost === host) return true;
      } catch {}
    }

    // CSRF check failed
    return false;
  }

  return true;
}
