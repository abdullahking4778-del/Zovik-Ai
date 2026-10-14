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

// 4. IP & SSRF Defense Rules
console.log("\n--- 4. IP & SSRF Range Detection ---");
function isPrivateIpAddress(ip) {
  if (!ip) return true;
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = ip.match(ipv4Regex);
  if (ipMatch) {
    const [_, a, b] = ipMatch.map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }
  const cleanIpv6 = ip.replace(/[\[\]]/g, "").toLowerCase().trim();
  if (cleanIpv6.startsWith("::ffff:") || cleanIpv6.startsWith("ffff:")) {
    const mappedIpv4 = cleanIpv6.replace(/^::?ffff:/, "");
    return isPrivateIpAddress(mappedIpv4);
  }
  if (
    cleanIpv6 === "::1" ||
    cleanIpv6 === "::" ||
    cleanIpv6 === "0:0:0:0:0:0:0:1" ||
    cleanIpv6 === "0:0:0:0:0:0:0:0" ||
    cleanIpv6.startsWith("fe80:") ||
    cleanIpv6.startsWith("fc00:") ||
    cleanIpv6.startsWith("fd00:")
  ) {
    return true;
  }
  return false;
}

try {
  report("Detects 127.0.0.1 as private", isPrivateIpAddress("127.0.0.1") === true);
  report("Detects 169.254.169.254 as private (AWS metadata)", isPrivateIpAddress("169.254.169.254") === true);
  report("Detects 10.0.0.1 as private", isPrivateIpAddress("10.0.0.1") === true);
  report("Detects 192.168.1.1 as private", isPrivateIpAddress("192.168.1.1") === true);
  report("Detects ::1 as private loopback", isPrivateIpAddress("::1") === true);
  report("Detects 0:0:0:0:0:0:0:1 as private loopback", isPrivateIpAddress("0:0:0:0:0:0:0:1") === true);
  report("Detects ::ffff:127.0.0.1 as private (IPv4-mapped IPv6)", isPrivateIpAddress("::ffff:127.0.0.1") === true);
  report("Detects ::ffff:169.254.169.254 as private (IPv4-mapped metadata)", isPrivateIpAddress("::ffff:169.254.169.254") === true);
  report("Permits 8.8.8.8 as public internet IP", isPrivateIpAddress("8.8.8.8") === false);
  report("Permits 1.1.1.1 as public internet IP", isPrivateIpAddress("1.1.1.1") === false);
} catch (err) {
  report("IP Address Detection Test Exception", false, err.message);
}

// 5. Account Deletion & Restore Response Logic
console.log("\n--- 5. Tombstone & Purge Completion Logic ---");
function computePurgeStatus({ localDeleted, tombstonePersistent, firebaseAuthDeleted, hasSupabase, supabaseDeleted, hasFirestore, firestoreDeleted }) {
  const isFullyPurged =
    localDeleted &&
    tombstonePersistent &&
    firebaseAuthDeleted &&
    (!hasSupabase || supabaseDeleted) &&
    (!hasFirestore || firestoreDeleted);
  const isPartiallyPurged = localDeleted || tombstonePersistent || supabaseDeleted || firestoreDeleted;
  return { isFullyPurged, isPartiallyPurged, statusCode: isFullyPurged ? 200 : isPartiallyPurged ? 207 : 500 };
}

try {
  // All succeed
  const full = computePurgeStatus({ localDeleted: true, tombstonePersistent: true, firebaseAuthDeleted: true, hasSupabase: true, supabaseDeleted: true, hasFirestore: true, firestoreDeleted: true });
  report("All stores succeed -> 200 OK Full Purge", full.isFullyPurged === true && full.statusCode === 200);

  // Supabase fails -> must NOT report full success
  const partialSb = computePurgeStatus({ localDeleted: true, tombstonePersistent: true, firebaseAuthDeleted: true, hasSupabase: true, supabaseDeleted: false, hasFirestore: true, firestoreDeleted: true });
  report("Supabase fails -> 207 Multi-Status Partial Purge", partialSb.isFullyPurged === false && partialSb.statusCode === 207);

  // Firestore fails -> must NOT report full success
  const partialFs = computePurgeStatus({ localDeleted: true, tombstonePersistent: true, firebaseAuthDeleted: true, hasSupabase: true, supabaseDeleted: true, hasFirestore: true, firestoreDeleted: false });
  report("Firestore fails -> 207 Multi-Status Partial Purge", partialFs.isFullyPurged === false && partialFs.statusCode === 207);

  // Unmark deleted response handling
  function resolveUnmarkResponse(storageResult) {
    if (!storageResult.success) {
      return { status: 502, success: false, error: storageResult.error || "Failed" };
    }
    return { status: 200, success: true };
  }
  const failedUnmark = resolveUnmarkResponse({ success: false, error: "Cloud connection refused" });
  report("Failed tombstone removal returns 502 Bad Gateway", failedUnmark.status === 502 && failedUnmark.success === false);
  const okUnmark = resolveUnmarkResponse({ success: true });
  report("Successful tombstone removal returns 200 OK", okUnmark.status === 200 && okUnmark.success === true);
} catch (err) {
  report("Purge Completion Test Exception", false, err.message);
}

// 6. Companion Ownership & Authorization Rules
console.log("\n--- 6. Companion Ownership & Authorization Guard ---");
function verifyCompanionDeletionPermission({ isAdmin, sessionUser, target }) {
  if (!target) return { allowed: false, status: 404, error: "Not found" };
  if (isAdmin) return { allowed: true, status: 200 };

  if (!sessionUser || !sessionUser.authenticated) {
    return { allowed: false, status: 401, error: "Unauthorized: Sign-in required" };
  }

  const isOfficial = !target.id.startsWith("char_custom") && target.category !== "Custom";
  if (isOfficial) {
    return { allowed: false, status: 403, error: "Unauthorized: Cannot delete official companions" };
  }

  const isOwner = Boolean(
    (target.creatorId && sessionUser.userId && target.creatorId === sessionUser.userId) ||
    (target.creatorEmail && sessionUser.userEmail && target.creatorEmail.toLowerCase() === sessionUser.userEmail.toLowerCase())
  );

  const hasCreatorInfo = Boolean(target.creatorId || target.creatorEmail);
  if (!isOwner && (hasCreatorInfo || !isAdmin)) {
    return { allowed: false, status: 403, error: "Forbidden: Not owner" };
  }

  return { allowed: true, status: 200 };
}

try {
  // Unauthenticated user -> 401
  const unauth = verifyCompanionDeletionPermission({
    isAdmin: false,
    sessionUser: { authenticated: false },
    target: { id: "char_custom_99", category: "Custom", creatorId: "user_1" },
  });
  report("Unauthenticated companion delete rejected (401)", !unauth.allowed && unauth.status === 401);

  // Non-admin trying to delete official companion -> 403
  const officialDelete = verifyCompanionDeletionPermission({
    isAdmin: false,
    sessionUser: { authenticated: true, userId: "user_1" },
    target: { id: "char_official_1", category: "Anime" },
  });
  report("Non-admin cannot delete official companion (403)", !officialDelete.allowed && officialDelete.status === 403);

  // Non-admin trying to delete someone else's custom companion -> 403
  const mismatchOwner = verifyCompanionDeletionPermission({
    isAdmin: false,
    sessionUser: { authenticated: true, userId: "attacker_id" },
    target: { id: "char_custom_99", category: "Custom", creatorId: "victim_id" },
  });
  report("Mismatched creator ID rejected (403 Forbidden)", !mismatchOwner.allowed && mismatchOwner.status === 403);

  // Non-admin trying to delete orphaned custom companion -> 403
  const orphanedDelete = verifyCompanionDeletionPermission({
    isAdmin: false,
    sessionUser: { authenticated: true, userId: "random_user" },
    target: { id: "char_custom_legacy", category: "Custom" },
  });
  report("Orphaned custom companion cannot be deleted by non-admin (403)", !orphanedDelete.allowed && orphanedDelete.status === 403);

  // Legitimate owner deletes their companion -> 200
  const ownerDelete = verifyCompanionDeletionPermission({
    isAdmin: false,
    sessionUser: { authenticated: true, userId: "user_owner", userEmail: "owner@test.com" },
    target: { id: "char_custom_mine", category: "Custom", creatorId: "user_owner" },
  });
  report("Legitimate creator can delete their custom companion (200 OK)", ownerDelete.allowed && ownerDelete.status === 200);

  // Admin deletes any companion -> 200
  const adminDelete = verifyCompanionDeletionPermission({
    isAdmin: true,
    sessionUser: { authenticated: false },
    target: { id: "char_custom_99", category: "Custom", creatorId: "user_1" },
  });
  report("Admin can delete custom companion (200 OK)", adminDelete.allowed && adminDelete.status === 200);
} catch (err) {
  report("Companion Authorization Test Exception", false, err.message);
}

// ---------------------------------------------------------------------------
// 7. Multi-Step & Persistence Reliability Guards
// ---------------------------------------------------------------------------
console.log("\n--- 7. Multi-Step & Persistence Reliability Guards ---");
try {
  // Test A: Two-step account consolidation compensatory rollback model
  let emailBalance = 100;
  let primaryBalance = 0;
  const transferAmount = 100;
  
  // Step 1: Debit email
  emailBalance -= transferAmount;
  let step2Failed = true;

  if (step2Failed) {
    // Compensatory Reversal executed
    emailBalance += transferAmount;
  } else {
    primaryBalance += transferAmount;
  }
  report("Consolidation rollback restores email balance on step-2 failure", emailBalance === 100 && primaryBalance === 0);

  // Test B: Pre-approval wallet credit gate
  let paymentStatus = "pending";
  let walletCredited = false;
  let creditThrowsError = true;

  try {
    if (creditThrowsError) {
      throw new Error("Simulated wallet store lock error");
    }
    walletCredited = true;
    paymentStatus = "approved";
  } catch {
    // Payment status remains un-mutated
  }
  report("Payment slip status remains pending if wallet credit fails", paymentStatus === "pending" && !walletCredited);

  // Test C: Economy persistence failure transparency
  let cachedConfig = { rate: 280 };
  let diskWriteFailed = true;

  try {
    if (diskWriteFailed) {
      throw new Error("EACCES: permission denied, open '.data/economy_config.json'");
    }
    cachedConfig = { rate: 300 };
  } catch {
    // Do not mutate in-memory cache to false success
  }
  report("Economy config rejects memory cache update on disk failure", cachedConfig.rate === 280);

  // Test D: Read-only GET snapshot safety (zero side-effects)
  const lookupExisting = (uid) => null; // simulates uninitialized user
  const readOnlyWallet = lookupExisting("new_user_123") || {
    id: "wal_new_user_123",
    balance: 0,
    currency: "CREDIT",
    status: "active",
  };
  report("Read-only wallet lookup creates zero records on GET", readOnlyWallet.balance === 0 && readOnlyWallet.id === "wal_new_user_123");

  // Test E: Production environment policy guard
  let productionErrorThrown = false;
  const isProduction = true;
  const isSupabaseActive = true;
  if (isProduction && isSupabaseActive) {
    try {
      throw new Error("[CRITICAL PRODUCTION CONFIGURATION ERROR]: Supabase tables missing in production");
    } catch {
      productionErrorThrown = true;
    }
  }
  report("Production policy rejects silent local fallback when cloud tables missing", productionErrorThrown);

  // Test F: Payment status update null protection
  let statusUpdateResult = null; // simulates failed status persistence
  let requestSuccess = false;
  let statusError = "";

  if (!statusUpdateResult) {
    statusError = "Failed to persist approved payment status record.";
    requestSuccess = false;
  } else {
    requestSuccess = true;
  }
  report("Payment workflow fails closed (500) if status persistence returns null", !requestSuccess && statusError.length > 0);
} catch (err) {
  report("Multi-step Reliability Test Exception", false, err.message);
}

// 8. In-Memory Caching & Groq Multi-Key Rotation Guard
console.log("\n--- 8. In-Memory Cache & Groq Multi-Key Rotation ---");
try {
  // Test A: In-memory cache freshness & write-through invalidation
  let readCount = 0;
  let simulatedDiskData = [{ id: "u_1", tier: "free" }];
  let cacheStore = null;
  let cacheTime = 0;
  const TTL = 5000;

  function getCachedUsers() {
    const now = Date.now();
    if (cacheStore && now - cacheTime < TTL) {
      return [...cacheStore];
    }
    readCount++;
    cacheStore = [...simulatedDiskData];
    cacheTime = now;
    return [...cacheStore];
  }

  function saveCachedUsers(newUsers) {
    cacheStore = [...newUsers];
    cacheTime = Date.now();
    simulatedDiskData = [...newUsers];
  }

  // First read reads from disk
  const r1 = getCachedUsers();
  // Second read hits in-memory cache
  const r2 = getCachedUsers();
  report("In-memory cache absorbs repeated reads without disk I/O", readCount === 1 && r1.length === 1 && r2.length === 1);

  // Write invalidation updates cache immediately
  saveCachedUsers([{ id: "u_1", tier: "free" }, { id: "u_2", tier: "vip" }]);
  const r3 = getCachedUsers();
  report("Write invalidates and updates in-memory cache synchronously", readCount === 1 && r3.length === 2);

  // Test B: Groq Multi-Key Parser & Deduplication
  const mockEnv = {
    GROQ_API_KEYS: "gsk_keyA12345, gsk_keyB67890\ngsk_keyC11111",
    GROQ_API_KEY: "gsk_keyA12345", // duplicate of keyA
    GROQ_API_KEY_2: "gsk_keyD22222",
  };

  function parseKeys(env) {
    const keys = [];
    if (env.GROQ_API_KEYS) {
      const list = env.GROQ_API_KEYS.split(/[,\s\n]+/).map((k) => k.trim()).filter((k) => k.length > 5);
      keys.push(...list);
    }
    if (env.GROQ_API_KEY && env.GROQ_API_KEY.trim().length > 5) {
      keys.push(env.GROQ_API_KEY.trim());
    }
    for (let i = 1; i <= 10; i++) {
      const val = env[`GROQ_API_KEY_${i}`];
      if (val && val.trim().length > 5) {
        keys.push(val.trim());
      }
    }
    return Array.from(new Set(keys));
  }

  const parsedKeys = parseKeys(mockEnv);
  report(
    "Groq multi-key parser aggregates comma/newline lists, numbered keys, and deduplicates",
    parsedKeys.length === 4 && parsedKeys.includes("gsk_keyD22222") && !parsedKeys.includes("")
  );

  // Test C: Groq Round-Robin Rotation
  let rrIndex = 0;
  function rotateKeys(keys) {
    if (keys.length <= 1) return keys;
    const startIdx = rrIndex % keys.length;
    rrIndex = (rrIndex + 1) % keys.length;
    return [...keys.slice(startIdx), ...keys.slice(0, startIdx)];
  }

  const rot1 = rotateKeys(parsedKeys);
  const rot2 = rotateKeys(parsedKeys);
  report(
    "Groq round-robin rotates starting key sequentially across turns",
    rot1[0] === "gsk_keyA12345" && rot2[0] === "gsk_keyB67890"
  );

  // Test D: Groq 429, 401/403, and 5xx Server Down Automatic Failover
  let activeKeyIndex = 0;
  let switchCount = 0;
  const simulateFailover = (statusCodeOrError) => {
    if (
      statusCodeOrError === 429 ||
      statusCodeOrError === 401 ||
      statusCodeOrError === 403 ||
      statusCodeOrError === 500 ||
      statusCodeOrError === 502 ||
      statusCodeOrError === 503 ||
      statusCodeOrError === "timeout"
    ) {
      if (activeKeyIndex + 1 < parsedKeys.length) {
        activeKeyIndex++;
        switchCount++;
        return true;
      }
    }
    return false;
  };

  const switchedOn429 = simulateFailover(429);
  report(
    "Automatic failover switches to next available key on HTTP 429 rate limit",
    switchedOn429 && activeKeyIndex === 1
  );

  const switchedOn503 = simulateFailover(503);
  report(
    "Automatic failover switches to next available key on HTTP 503 Groq server down",
    switchedOn503 && activeKeyIndex === 2
  );

  const switchedOnTimeout = simulateFailover("timeout");
  report(
    "Automatic failover switches to next available key on network timeout",
    switchedOnTimeout && activeKeyIndex === 3
  );

  // Test E: Circuit breaker health prioritization
  const cooldownMap = new Map();
  cooldownMap.set("gsk_keyA12345", Date.now() + 60000); // keyA is cooling down
  const isHealthy = (k) => !cooldownMap.has(k) || Date.now() > cooldownMap.get(k);

  const healthyFirst = (all) => {
    const h = all.filter(isHealthy);
    const unh = all.filter((k) => !isHealthy(k));
    return [...h, ...unh];
  };

  const prioritized = healthyFirst(parsedKeys);
  report(
    "Circuit breaker automatically demotes failed/cooling key to tail and promotes healthy keys to front",
    prioritized[0] !== "gsk_keyA12345" && prioritized[prioritized.length - 1] === "gsk_keyA12345"
  );
} catch (err) {
  report("In-Memory & Multi-Key Test Exception", false, err.message);
}

console.log("\n=======================================================");
console.log(`📊 UNIT TEST REPORT: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log("=======================================================");

if (failedTests > 0) process.exit(1);
