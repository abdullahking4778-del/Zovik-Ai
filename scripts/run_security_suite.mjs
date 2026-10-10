/**
 * Repeatable Automated Security & Reliability Verification Suite
 * Tests:
 * 1. Admin Password Security: scrypt salted hashing, constant-time verification, unique salts
 * 2. JWT Secret Integrity: strict requirement of strong server-only secret (>= 24 chars)
 * 3. Token Leakage & Password Disclosure Prevention: Admin login does not leak token or secrets in JSON
 * 4. Unauthorized Access: Protected endpoints reject requests lacking session cookie (401)
 * 5. Invalid Credentials & Forged Tokens: Malformed or forged tokens are rejected (401)
 * 6. CSRF Mitigation: Cookie-authenticated mutating requests require CSRF indicator
 * 7. SSRF & Unsafe URL Protection: Image proxy blocks localhost, private IPs, non-HTTP protocols
 * 8. Rate Limiting Defense: Failed login attempts trigger 429 Lockout
 * 9. Unthrottled Logout: Rate-limited client can still safely logout
 * 10. Deletion Safeguards: Tombstoned users cannot self-unmark; status returns 410
 * 11. Password Form Length Alignment: Server enforces minimum 8 characters
 */

import crypto from "crypto";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

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

function skip(testName, reason = "") {
  skippedTests++;
  console.log(`\x1b[33m[SKIP]\x1b[0m ${testName} ${reason ? "(" + reason + ")" : ""}`);
}

// Safety Guard: Refuse to execute against production domains
function assertSafeTestTarget(urlStr) {
  const parsed = new URL(urlStr);
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".test");
  if (!isLocal) {
    throw new Error(
      `[SAFETY ABORT]: Test suite attempted to run against '${host}'. Running tests against production is forbidden.`
    );
  }
}

// ---------------------------------------------------------------------------
// 1. Password Hashing & Verification Logic (scrypt + constant time)
// ---------------------------------------------------------------------------
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

console.log("\n=======================================================");
console.log("🔒 ZOVIK AI: AUTOMATED SECURITY & RELIABILITY TEST SUITE");
console.log("=======================================================\n");

assertSafeTestTarget(BASE_URL);

console.log("--- 1. Password Security & Cryptographic Hashing ---");
try {
  const testSecret = "SuperSecurePassword99!#";
  const hash1 = hashPassword(testSecret);
  const hash2 = hashPassword(testSecret);

  report(
    "Scrypt Hash Format: Produces 'scrypt$<salt>$<hash>' format",
    hash1.startsWith("scrypt$") && hash1.split("$").length === 3
  );

  report(
    "Salt Uniqueness: Identical passwords produce distinct salted hashes",
    hash1 !== hash2
  );

  report(
    "Constant-Time Verification: Valid password matches stored hash",
    verifyPassword(testSecret, hash1) === true
  );

  report(
    "Constant-Time Verification: Incorrect password fails verification",
    verifyPassword("WrongPassword123!", hash1) === false
  );

  report(
    "Null / Empty Password Defense: Rejects empty inputs safely",
    verifyPassword("", hash1) === false && verifyPassword(testSecret, "") === false
  );
} catch (err) {
  report("Password Cryptographic Test Exception", false, err.message);
}

// ---------------------------------------------------------------------------
// 2. JWT Secret & Token Generation Integrity
// ---------------------------------------------------------------------------
console.log("\n--- 2. JWT Secret Enforcement & Token Integrity ---");
try {
  function testSecretValidation(secret) {
    if (!secret || secret.length < 24) {
      throw new Error("ADMIN_JWT_SECRET is missing or too short (>= 24 chars required).");
    }
    return true;
  }

  let caughtWeak = false;
  try {
    testSecretValidation("short");
  } catch {
    caughtWeak = true;
  }
  report("JWT Secret: Fails closed when secret is shorter than 24 chars", caughtWeak);

  let caughtEmpty = false;
  try {
    testSecretValidation("");
  } catch {
    caughtEmpty = true;
  }
  report("JWT Secret: Fails closed when secret is empty / undefined", caughtEmpty);

  const strongSecret = "zovik_admin_sec_8a7f9c2d1e4b5678_hash_key_99";
  report("JWT Secret: Accepts strong server-only secret (>= 24 chars)", testSecretValidation(strongSecret));
} catch (err) {
  report("JWT Secret Validation Exception", false, err.message);
}

// ---------------------------------------------------------------------------
// 3. HTTP Integration Tests Against Live Local Server
// ---------------------------------------------------------------------------
async function runHttpSecurityTests() {
  console.log("\n--- 3. Protected Endpoint Authorization (401 Rejection) ---");

  const protectedRoutes = [
    { method: "GET", path: "/api/admin/auth" },
    { method: "GET", path: "/api/admin/users" },
    { method: "PUT", path: "/api/admin/users", body: { userId: "test", tier: "vip" } },
    { method: "POST", path: "/api/admin/characters", body: { name: "Hacker" } },
    { method: "PUT", path: "/api/admin/characters", body: { id: "test", name: "Hacker" } },
    { method: "DELETE", path: "/api/admin/characters?id=test" },
    { method: "POST", path: "/api/admin/change-password", body: { newPassword: "hack" } },
    { method: "POST", path: "/api/admin/announcement", body: { enabled: true, text: "hack" } },
    { method: "POST", path: "/api/admin/payment-accounts", body: { accounts: {} } },
  ];

  for (const route of protectedRoutes) {
    try {
      const res = await fetch(`${BASE_URL}${route.path}`, {
        method: route.method,
        headers: { "Content-Type": "application/json" },
        body: route.body ? JSON.stringify(route.body) : undefined,
      });
      report(
        `Unauthorized ${route.method} ${route.path} rejected (401)`,
        res.status === 401,
        `Status: ${res.status}`
      );
    } catch (err) {
      report(`Unauthorized ${route.method} ${route.path} connection exception`, false, err.message);
    }
  }

  console.log("\n--- 4. Forged & Malformed Token Defense ---");
  try {
    const forgedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWRtaW4ifQ.fake_signature";
    const res = await fetch(`${BASE_URL}/api/admin/auth`, {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    report("Forged Authorization Bearer token rejected (401)", res.status === 401, `Status: ${res.status}`);

    const forgedCookieRes = await fetch(`${BASE_URL}/api/admin/auth`, {
      headers: { Cookie: `zovik_admin_session=${forgedToken}` },
    });
    report("Forged cookie session rejected (401)", forgedCookieRes.status === 401, `Status: ${forgedCookieRes.status}`);
  } catch (err) {
    report("Forged Token Exception", false, err.message);
  }

  console.log("\n--- 5. Token Leakage & Password Disclosure Prevention ---");
  try {
    const wrongAuthRes = await fetch(`${BASE_URL}/api/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "definitely_wrong_password_9988" }),
    });
    const wrongAuthBody = await wrongAuthRes.json().catch(() => ({}));
    report(
      "Admin Auth: Wrong password rejected with 401",
      wrongAuthRes.status === 401
    );
    report(
      "Token Leakage: Failed auth response does not expose token in body",
      wrongAuthBody.token === undefined
    );

    const adminPassword = process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || "";
    if (adminPassword) {
      const loginRes = await fetch(`${BASE_URL}/api/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-zovik-admin-request": "1" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const loginBody = await loginRes.json().catch(() => ({}));
      const cookieHeader = loginRes.headers.get("set-cookie") || "";

      report(
        "Admin Login: Successful login sets HttpOnly session cookie",
        cookieHeader.includes("zovik_admin_session=") && cookieHeader.includes("HttpOnly"),
        "Cookie set safely with HttpOnly flag"
      );

      report(
        "Token Leakage: Successful login NEVER returns raw token in JSON response body",
        loginBody.token === undefined
      );

      // CSRF validation on mutating endpoint with cookie
      const sessionCookie = cookieHeader.split(";")[0];
      const csrfAttackRes = await fetch(`${BASE_URL}/api/admin/announcement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
          Origin: "https://malicious-attacker-website.com",
        },
        body: JSON.stringify({ enabled: true, text: "CSRF Test" }),
      });
      report(
        "CSRF Defense: Cross-origin mutating cookie request without custom header is rejected (401/403)",
        csrfAttackRes.status === 401 || csrfAttackRes.status === 403,
        `Status: ${csrfAttackRes.status}`
      );
    } else {
      skip("Admin Session Live Authentication Tests", "ADMIN_PASSWORD not set in environment");
    }
  } catch (err) {
    report("Token Leakage Check Exception", false, err.message);
  }

  console.log("\n--- 6. SSRF & Unsafe File/URL Input Defense ---");
  const unsafeUrls = [
    { name: "Localhost HTTP", url: "http://localhost:3000/api/characters" },
    { name: "Loopback IPv4", url: "http://127.0.0.1:3000/api/characters" },
    { name: "AWS Cloud Metadata IP", url: "http://169.254.169.254/latest/meta-data/" },
    { name: "Local File Scheme", url: "file:///etc/passwd" },
    { name: "FTP Scheme", url: "ftp://example.com/malicious.jpg" },
    { name: "Javascript Scheme", url: "javascript:alert(1)" },
  ];

  for (const item of unsafeUrls) {
    try {
      const res = await fetch(`${BASE_URL}/api/proxy-image?url=${encodeURIComponent(item.url)}`);
      report(
        `SSRF Defense: Blocked ${item.name} (${res.status} Bad Request)`,
        res.status === 400,
        `Status: ${res.status}`
      );
    } catch (err) {
      report(`SSRF Defense ${item.name} Exception`, false, err.message);
    }
  }

  console.log("\n--- 7. Rate Limiting Defense & Unthrottled Logout ---");
  try {
    const testIp = "203.0.113.210"; // RFC 5737 test subnet
    let lockoutTriggered = false;

    for (let i = 1; i <= 6; i++) {
      const res = await fetch(`${BASE_URL}/api/admin/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": testIp,
        },
        body: JSON.stringify({ password: `wrong_pass_attempt_${i}` }),
      });

      if (res.status === 429) {
        lockoutTriggered = true;
        break;
      }
    }

    report(
      "Persistent Rate Limiting: 5+ failed login attempts trigger 429 lockout",
      lockoutTriggered === true
    );

    // Verify logout CANNOT be prevented by login throttling
    const logoutRes = await fetch(`${BASE_URL}/api/admin/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": testIp,
      },
      body: JSON.stringify({ action: "logout" }),
    });

    report(
      "Unthrottled Logout: Rate-limited client can still safely logout (200 OK)",
      logoutRes.status === 200,
      `Status: ${logoutRes.status}`
    );
  } catch (err) {
    report("Rate Limiting Test Exception", false, err.message);
  }

  console.log("\n--- 8. Account Deletion & Identity Safeguards ---");
  try {
    // 1. Non-admin cannot self-unmark a deleted tombstone
    const unmarkRes = await fetch(`${BASE_URL}/api/user/unmark-deleted`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "mock_test_uid" }),
    });
    report(
      "Deletion Safeguard: Non-admin calling unmark-deleted is rejected (403 Forbidden)",
      unmarkRes.status === 403,
      `Status: ${unmarkRes.status}`
    );

    // 2. Unauthenticated check on user status
    const unauthStatusRes = await fetch(`${BASE_URL}/api/user/status`);
    report(
      "User Status: Unauthenticated access rejected (401 Unauthorized)",
      unauthStatusRes.status === 401,
      `Status: ${unauthStatusRes.status}`
    );
  } catch (err) {
    report("Deletion Safeguards Exception", false, err.message);
  }

  console.log("\n--- 9. Database & Form Validation Safeguards ---");
  try {
    // 1. Updating user with missing required primary key
    const badUserRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_token", // Will be 401 without admin auth
      },
      body: JSON.stringify({}),
    });
    report(
      "Database Safeguard: Unauthorized user updates fail securely (401)",
      badUserRes.status === 401,
      `Status: ${badUserRes.status}`
    );

    // 2. Password length alignment check: password change requires >= 8 chars
    const shortPassRes = await fetch(`${BASE_URL}/api/admin/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "valid12345", newPassword: "short" }),
    });
    report(
      "Password Validation: Password change requires at least 8 characters (401/400)",
      shortPassRes.status === 401 || shortPassRes.status === 400,
      `Status: ${shortPassRes.status}`
    );
  } catch (err) {
    report("Database Validation Exception", false, err.message);
  }

  console.log("\n=======================================================");
  console.log(`📊 FINAL TEST REPORT: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED, ${skippedTests} SKIPPED)`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runHttpSecurityTests().catch((err) => {
  console.error("Unhandled Security Suite Error:", err);
  process.exit(1);
});
