/**
 * SAFE AUDIT FIXES VERIFICATION (Local Test Environment Only)
 * 
 * Safety Rules:
 * 1. Fails immediately if pointed at any non-localhost / production URL.
 * 2. Never mutates live payment accounts or production CMS data.
 * 3. Never prints session tokens, passwords, or personal user data.
 * 4. Safe for CI and automated test environments.
 */

import assert from "assert";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

// Safety Guard: Refuse to run against production domains
function assertSafeTestTarget(urlStr) {
  const parsed = new URL(urlStr);
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".test");
  if (!isLocal) {
    throw new Error(
      `[SAFETY ABORT]: Test suite attempted to run against non-local host '${host}'. Running tests against live/production domains is strictly prohibited.`
    );
  }
}

async function runSafeVerification() {
  console.log("=== VERIFYING AUDIT FIXES & SYSTEM HEALTH (SAFE TEST MODE) ===");
  assertSafeTestTarget(BASE);

  // 1. SSRF Protection Verification on /api/proxy-image
  console.log("\n--- Testing SSRF & Unsafe Schemes Protection ---");
  const ssrf1 = await fetch(`${BASE}/api/proxy-image?url=http://127.0.0.1:3000/api/admin/auth`);
  assert.strictEqual(ssrf1.status, 400, "SSRF loopback 127.0.0.1 must be rejected with 400");
  const ssrf2 = await fetch(`${BASE}/api/proxy-image?url=http://169.254.169.254/latest/meta-data/`);
  assert.strictEqual(ssrf2.status, 400, "SSRF cloud metadata 169.254.169.254 must be rejected with 400");
  const ssrf3 = await fetch(`${BASE}/api/proxy-image?url=file:///etc/passwd`);
  assert.strictEqual(ssrf3.status, 400, "Local file scheme must be rejected with 400");
  console.log("✔ SSRF prevention verified (Loopback, Cloud Metadata, File Scheme)");

  // 2. Public Announcement Bar GET
  console.log("\n--- Testing Announcement Endpoint ---");
  const annRes = await fetch(`${BASE}/api/announcement`);
  assert.strictEqual(annRes.status, 200, "Public announcement GET must return 200");
  const annData = await annRes.json();
  assert.strictEqual(annData.success, true, "Announcement response must have success=true");
  assert.ok(annData.announcement, "Announcement object present in response");
  console.log("✔ Public announcement response shape verified");

  // 3. Unauthorized Admin Routes Rejection
  console.log("\n--- Testing Unauthorized Admin Rejections ---");
  const unauthAuth = await fetch(`${BASE}/api/admin/auth`);
  assert.strictEqual(unauthAuth.status, 401, "Unauthenticated GET /api/admin/auth must return 401");
  const unauthUsers = await fetch(`${BASE}/api/admin/users`);
  assert.strictEqual(unauthUsers.status, 401, "Unauthenticated GET /api/admin/users must return 401");
  const unauthChangePass = await fetch(`${BASE}/api/admin/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "foo", newPassword: "bar" }),
  });
  assert.strictEqual(unauthChangePass.status, 401, "Unauthenticated password change must return 401");
  console.log("✔ Admin endpoints strictly reject unauthenticated access (401)");

  // 4. Rate Limiting Check on Malicious IP
  console.log("\n--- Testing Login Rate Limiting ---");
  const testIp = "203.0.113.200"; // RFC 5737 dedicated test subnet
  let lockoutSeen = false;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${BASE}/api/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": testIp },
      body: JSON.stringify({ password: "invalid_test_pwd_" + i }),
    });
    if (res.status === 429) {
      lockoutSeen = true;
      break;
    }
  }
  assert.strictEqual(lockoutSeen, true, "Persistent rate limiting must trigger 429 lockout");
  console.log("✔ Login rate limiting lockout confirmed");

  console.log("\n=================================================");
  console.log("✔ ALL SAFE VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runSafeVerification().catch((err) => {
  console.error("[Safe Verification Failure]:", err.message);
  process.exit(1);
});
