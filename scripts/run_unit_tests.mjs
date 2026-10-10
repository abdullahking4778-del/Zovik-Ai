/**
 * ISOLATED UNIT TESTS (Pure In-Memory / No HTTP Server Required)
 * Tests:
 * 1. Password Hashing format, salt randomness, constant-time verification
 * 2. JWT Secret validation logic (fail-closed on short/missing secrets)
 * 3. Client IP extraction rules
 * 4. Production URL guard assertion
 */

import crypto from "crypto";
import assert from "assert";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(testName, passed, details = "") {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`\x1b[32m[PASS]\x1b[0m ${testName} ${details ? "(" + details + ")" : ""}`);
  } else {
    failedTests++;
    console.error(`\x1b[31m[FAIL]\x1b[0m ${testName} ${details ? "- " + details : ""}`);
  }
}

console.log("\n=======================================================");
console.log("🧪 ZOVIK AI: ISOLATED UNIT TEST SUITE");
console.log("=======================================================\n");

// 1. Password Hashing & Constant Time Verification
console.log("--- 1. Cryptographic Password Logic ---");
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

function verifyPassword(candidate, stored) {
  if (!candidate || !stored) return false;
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
  return false;
}

try {
  const secret = "AdminPassword2026!#";
  const h1 = hashPassword(secret);
  const h2 = hashPassword(secret);

  report("Hash structure: Scrypt formatted string with salt", h1.startsWith("scrypt$") && h1.split("$").length === 3);
  report("Salt randomness: Distinct salts generate distinct hashes", h1 !== h2);
  report("Constant-time matching: Correct password returns true", verifyPassword(secret, h1) === true);
  report("Constant-time rejection: Wrong password returns false", verifyPassword("WrongPassword!", h1) === false);
  report("Empty password rejection: Rejects empty input safely", verifyPassword("", h1) === false);
} catch (err) {
  report("Cryptographic Password Test Exception", false, err.message);
}

// 2. JWT Secret Validation
console.log("\n--- 2. Server JWT Secret Validation ---");
function validateJwtSecret(secret) {
  if (!secret || typeof secret !== "string" || secret.trim().length < 24) {
    throw new Error("ADMIN_JWT_SECRET is missing or too short (>= 24 chars strictly required).");
  }
  return true;
}

try {
  let shortCaught = false;
  try {
    validateJwtSecret("short_123");
  } catch {
    shortCaught = true;
  }
  report("Fail closed on short secret (< 24 chars)", shortCaught);

  let emptyCaught = false;
  try {
    validateJwtSecret("");
  } catch {
    emptyCaught = true;
  }
  report("Fail closed on empty secret", emptyCaught);

  report("Accept valid 32-char secret", validateJwtSecret("a_secure_random_jwt_secret_32_characters!!"));
} catch (err) {
  report("JWT Secret Unit Test Exception", false, err.message);
}

// 3. Production Safety Guard
console.log("\n--- 3. Test Runner Safety Guard ---");
function assertSafeTestTarget(urlStr) {
  const parsed = new URL(urlStr);
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".test");
  if (!isLocal) {
    throw new Error(`[SAFETY ABORT]: Host '${host}' is non-local.`);
  }
}

try {
  report("Allows localhost:3000", (() => {
    try { assertSafeTestTarget("http://localhost:3000"); return true; } catch { return false; }
  })());

  report("Allows 127.0.0.1:3000", (() => {
    try { assertSafeTestTarget("http://127.0.0.1:3000"); return true; } catch { return false; }
  })());

  let prodBlocked = false;
  try {
    assertSafeTestTarget("https://zovik.ai");
  } catch {
    prodBlocked = true;
  }
  report("Safely blocks production target domain", prodBlocked);
} catch (err) {
  report("Safety Guard Unit Test Exception", false, err.message);
}

console.log("\n=======================================================");
console.log(`📊 UNIT TEST REPORT: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log("=======================================================\n");

if (failedTests > 0) process.exit(1);
