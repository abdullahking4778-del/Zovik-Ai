import assert from "assert";

const BASE = "http://localhost:3000";

async function testAll() {
  console.log("=== VERIFYING AUDIT FIXES & NEW CMS FEATURES ===");

  const adminPassword = process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || "";
  if (!adminPassword) {
    console.log("[SKIP] ADMIN_PASSWORD environment variable not set. Skipping live admin tests.");
    return;
  }

  // 1. Test Admin Login for Session Cookie
  const loginRes = await fetch(`${BASE}/api/admin/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-zovik-admin-request": "1" },
    body: JSON.stringify({ password: adminPassword }),
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true, "Admin login must succeed");
  const cookieHeader = loginRes.headers.get("set-cookie") || "";
  const adminCookie = cookieHeader.split(";")[0];
  console.log("✔ Admin authentication & session cookie verified");

  // 2. Test Top Running Announcement Bar ("Patti") Public GET
  const annRes = await fetch(`${BASE}/api/announcement`);
  const annData = await annRes.json();
  assert.strictEqual(annData.success, true, "Announcement GET must succeed");
  assert.ok(annData.announcement, "Announcement object present");
  console.log("✔ Public /api/announcement response OK:", annData.announcement.badge);

  // 3. Test Admin Announcement Update
  const updateAnnRes = await fetch(`${BASE}/api/admin/announcement`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
      "x-zovik-admin-request": "1",
    },
    body: JSON.stringify({
      enabled: true,
      badge: "MEGA DEAL ⚡",
      text: "Testing Live Announcement Bar CMS Update",
    }),
  });
  const updateAnnData = await updateAnnRes.json();
  assert.strictEqual(updateAnnData.success, true, "Admin announcement update must succeed");
  console.log("✔ Admin /api/admin/announcement update verified");

  // 4. Test Payment Accounts Public GET & Admin Update
  const payAccRes = await fetch(`${BASE}/api/payment-accounts`);
  const payAccData = await payAccRes.json();
  assert.strictEqual(payAccData.success, true, "Payment accounts GET must succeed");
  assert.ok(payAccData.accounts.easypaisa, "EasyPaisa account details present");
  console.log("✔ Public /api/payment-accounts OK. Current EasyPaisa:", payAccData.accounts.easypaisa.number);

  const updatePayAccRes = await fetch(`${BASE}/api/admin/payment-accounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
      "x-zovik-admin-request": "1",
    },
    body: JSON.stringify({
      easypaisa: {
        number: "03427646038",
        title: "AMINA AKRAM",
      },
    }),
  });
  const updatePayAccData = await updatePayAccRes.json();
  assert.strictEqual(updatePayAccData.success, true, "Payment accounts update must succeed");
  console.log("✔ Admin /api/admin/payment-accounts update verified");

  // 5. Test SSRF Protection on /api/proxy-image
  const ssrf1 = await fetch(`${BASE}/api/proxy-image?url=http://127.0.0.1:3000/api/admin/auth`);
  assert.strictEqual(ssrf1.status, 400, "SSRF loopback 127.0.0.1 must be rejected with 400");
  const ssrf2 = await fetch(`${BASE}/api/proxy-image?url=http://169.254.169.254/latest/meta-data/`);
  assert.strictEqual(ssrf2.status, 400, "SSRF cloud metadata 169.254.169.254 must be rejected with 400");
  console.log("✔ SSRF prevention on private IP and metadata endpoints verified");

  // 6. Test Pricing Plans have dynamic dailyMessages & dailyPhotos
  const plansRes = await fetch(`${BASE}/api/plans`);
  const plansData = await plansRes.json();
  assert.strictEqual(plansData.success, true, "Plans GET must succeed");
  const plusPlan = plansData.plans.find((p) => p.id === "plus");
  const vipPlan = plansData.plans.find((p) => p.id === "vip");
  assert.ok(plusPlan?.dailyMessages, "Plus plan has dailyMessages");
  assert.ok(vipPlan?.dailyMessages, "VIP plan has dailyMessages");
  console.log(`✔ Dynamic Plan Quotas confirmed: Plus=${plusPlan.dailyMessages} msgs / ${plusPlan.dailyPhotos} photos, VIP=${vipPlan.dailyMessages} msgs / ${vipPlan.dailyPhotos} photos`);

  console.log("\n=================================================");
  console.log("ALL AUDIT FIXES & NEW CMS CAPABILITIES VERIFIED 100%!");
  console.log("=================================================");
}

testAll().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
