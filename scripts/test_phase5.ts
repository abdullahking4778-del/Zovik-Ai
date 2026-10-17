import {
  getAllAdminUsers,
  saveAdminUser,
  deleteAdminUser,
  hasPermission,
} from "../src/lib/adminRbacStore";
import { recordAuditLog, getAuditLogs } from "../src/lib/auditStore";
import { getFraudAlerts, updateFraudAlertStatus, runFraudWatchdogScan } from "../src/lib/fraudStore";
import { generateSystemBackupJson, generateCsvExport } from "../src/lib/backupService";
import { createAdminToken } from "../src/lib/adminAuth";

async function runPhase5Tests() {
  console.log("=================================================");
  console.log("🧪 STARTING PHASE 5 COMPREHENSIVE TEST SUITE");
  console.log("Operations, Security & Governance");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${detail || "Condition not met"}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. RBAC Permissions Unit Tests
  // -----------------------------------------------------------------
  console.log("--- 1. Testing RBAC Role Capabilities ---");
  assert(hasPermission("super_admin", "manage_settings") === true, "Super Admin has manage_settings");
  assert(hasPermission("super_admin", "manage_characters") === true, "Super Admin has manage_characters");
  assert(hasPermission("support_admin", "manage_payments") === true, "Support Admin has manage_payments");
  assert(hasPermission("support_admin", "manage_settings") === false, "Support Admin cannot access manage_settings");
  assert(hasPermission("marketing_admin", "manage_events") === true, "Marketing Admin has manage_events");
  assert(hasPermission("marketing_admin", "manage_payments") === false, "Marketing Admin cannot access manage_payments");

  // -----------------------------------------------------------------
  // 2. Admin Accounts Store Unit Tests
  // -----------------------------------------------------------------
  console.log("\n--- 2. Testing Admin Team Store ---");
  const initialAdmins = await getAllAdminUsers();
  assert(Array.isArray(initialAdmins) && initialAdmins.length >= 3, "Seeded admins exist", `Found ${initialAdmins.length}`);

  const owner = initialAdmins.find((a) => a.role === "super_admin");
  assert(owner !== undefined && owner.email === "owner@zovik.ai", "Primary owner admin is configured");

  // Test adding sub-admin
  const testSubAdmin = await saveAdminUser({
    name: "Zovik Tester Subadmin",
    email: `test_admin_${Date.now()}@zovik.ai`,
    role: "support_admin",
  });
  assert(testSubAdmin.name === "Zovik Tester Subadmin", "New sub-admin created successfully");

  // Test removing sub-admin
  const deleteOk = await deleteAdminUser(testSubAdmin.id);
  assert(deleteOk === true, "Sub-admin revoked successfully");

  // Test root protection: Primary Super Admin cannot be deleted
  let rootProtected = false;
  try {
    await deleteAdminUser("adm_owner_primary");
  } catch {
    rootProtected = true;
  }
  assert(rootProtected === true, "Primary Super Admin account is protected against accidental deletion");

  // -----------------------------------------------------------------
  // 3. Immutable Audit Logs Unit Tests
  // -----------------------------------------------------------------
  console.log("\n--- 3. Testing Immutable Audit Log Stream ---");
  const initialLogs = await getAuditLogs();
  assert(Array.isArray(initialLogs) && initialLogs.length >= 4, "Seeded audit logs populated");

  const recordedLog = await recordAuditLog({
    actorEmail: "tester@zovik.ai",
    actorRole: "super_admin",
    action: "PASSWORD_CHANGED",
    resourceType: "security",
    details: "Automated test rotated master secret credentials.",
    severity: "critical",
  });
  assert(recordedLog.action === "PASSWORD_CHANGED", "New audit entry recorded");

  const criticalLogs = await getAuditLogs({ severity: "critical" });
  assert(
    criticalLogs.some((l) => l.id === recordedLog.id),
    "Audit log filter by severity returns recorded critical event"
  );

  // -----------------------------------------------------------------
  // 4. Anti-Abuse & Fraud Watchdog Unit Tests
  // -----------------------------------------------------------------
  console.log("\n--- 4. Testing Anti-Abuse & Fraud Watchdog ---");
  const alerts = await getFraudAlerts();
  assert(Array.isArray(alerts) && alerts.length >= 2, "Fraud watchdog alerts initialized");

  const scanAlerts = await runFraudWatchdogScan();
  assert(Array.isArray(scanAlerts) && scanAlerts.length >= alerts.length, "Automated watchdog scan ran successfully");

  const sampleAlert = alerts[0];
  const updatedAlert = await updateFraudAlertStatus(sampleAlert.id, "investigating");
  assert(updatedAlert?.status === "investigating", "Fraud alert status updated to investigating");

  // Re-resolve
  await updateFraudAlertStatus(sampleAlert.id, sampleAlert.status);

  // -----------------------------------------------------------------
  // 5. System Backup & CSV Export Unit Tests
  // -----------------------------------------------------------------
  console.log("\n--- 5. Testing Backup Snapshot & CSV Export Service ---");
  const backupJson = await generateSystemBackupJson();
  assert(
    backupJson.metadata?.version === "5.0.0" && Boolean(backupJson.data?.users),
    "System backup JSON contains complete schema and version 5.0.0",
    `Backup counts: users=${backupJson.metadata.counts.users}, payments=${backupJson.metadata.counts.payments}`
  );

  const paymentsCsv = await generateCsvExport("payments");
  assert(
    paymentsCsv.filename.endsWith(".csv") && paymentsCsv.csv.includes("Payment ID"),
    "Payments CSV generated with RFC 4180 headers"
  );

  const usersCsv = await generateCsvExport("users");
  assert(usersCsv.csv.includes("User ID") && usersCsv.csv.includes("Is VIP"), "Users CSV generated with VIP & coin headers");

  const auditCsv = await generateCsvExport("audit_logs");
  assert(auditCsv.csv.includes("Log ID") && auditCsv.csv.includes("Actor Email"), "Audit logs CSV generated");

  const offersCsv = await generateCsvExport("offers");
  assert(offersCsv.csv.includes("Promo Code") && offersCsv.csv.includes("Discount Type"), "Offers CSV generated");

  // -----------------------------------------------------------------
  // 6. Live HTTP API Route Tests (Against http://localhost:3000)
  // -----------------------------------------------------------------
  console.log("\n--- 6. Testing Live HTTP Governance Endpoints ---");
  const baseUrl = "http://localhost:3000";
  const adminToken = createAdminToken();

  // Test 6A: Unauthorized requests rejected
  const unauthAdmins = await fetch(`${baseUrl}/api/admin/governance/admins`);
  assert(unauthAdmins.status === 401, "GET /api/admin/governance/admins rejects unauthorized request with 401");

  const unauthAudit = await fetch(`${baseUrl}/api/admin/governance/audit`);
  assert(unauthAudit.status === 401, "GET /api/admin/governance/audit rejects unauthorized request with 401");

  const unauthFraud = await fetch(`${baseUrl}/api/admin/governance/fraud`);
  assert(unauthFraud.status === 401, "GET /api/admin/governance/fraud rejects unauthorized request with 401");

  const unauthExport = await fetch(`${baseUrl}/api/admin/governance/export?type=payments`);
  assert(unauthExport.status === 401, "GET /api/admin/governance/export rejects unauthorized request with 401");

  // Test 6B: Authorized GET /api/admin/governance/admins
  const authAdmins = await fetch(`${baseUrl}/api/admin/governance/admins`, {
    headers: { Authorization: `Bearer ${adminToken}`, "x-zovik-admin-request": "1" },
  });
  assert(authAdmins.status === 200, "GET /api/admin/governance/admins returns 200");
  const adminsJson = await authAdmins.json();
  assert(adminsJson.success === true && Array.isArray(adminsJson.admins), "Admin users array returned");

  // Test 6C: Authorized POST & DELETE /api/admin/governance/admins
  const postAdminRes = await fetch(`${baseUrl}/api/admin/governance/admins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
      "x-zovik-admin-request": "1",
    },
    body: JSON.stringify({
      name: "API Test Admin",
      email: `api_admin_${Date.now()}@zovik.ai`,
      role: "marketing_admin",
    }),
  });
  assert(postAdminRes.status === 200, "POST /api/admin/governance/admins creates sub-admin via HTTP");
  const createdAdminData = await postAdminRes.json();

  if (createdAdminData.admin?.id) {
    const deleteAdminRes = await fetch(`${baseUrl}/api/admin/governance/admins?id=${createdAdminData.admin.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}`, "x-zovik-admin-request": "1" },
    });
    assert(deleteAdminRes.status === 200, "DELETE /api/admin/governance/admins removes sub-admin via HTTP");
  }

  // Test 6D: Authorized GET /api/admin/governance/audit
  const authAudit = await fetch(`${baseUrl}/api/admin/governance/audit?severity=all&limit=10`, {
    headers: { Authorization: `Bearer ${adminToken}`, "x-zovik-admin-request": "1" },
  });
  assert(authAudit.status === 200, "GET /api/admin/governance/audit returns 200");
  const auditJson = await authAudit.json();
  assert(auditJson.success === true && Array.isArray(auditJson.logs), "Audit logs array returned via HTTP");

  // Test 6E: Authorized GET /api/admin/governance/fraud
  const authFraud = await fetch(`${baseUrl}/api/admin/governance/fraud`, {
    headers: { Authorization: `Bearer ${adminToken}`, "x-zovik-admin-request": "1" },
  });
  assert(authFraud.status === 200, "GET /api/admin/governance/fraud returns 200");

  // Test 6F: Authorized GET /api/admin/governance/export?type=payments
  const authExportCsv = await fetch(`${baseUrl}/api/admin/governance/export?type=payments`, {
    headers: { Authorization: `Bearer ${adminToken}`, "x-zovik-admin-request": "1" },
  });
  assert(authExportCsv.status === 200, "GET /api/admin/governance/export?type=payments returns 200");
  const contentType = authExportCsv.headers.get("content-type") || "";
  assert(contentType.includes("text/csv"), "Export endpoint returns text/csv header for payments export");

  // Test 6G: Authorized GET /api/admin/governance/export?type=full_backup
  const authExportBackup = await fetch(`${baseUrl}/api/admin/governance/export?type=full_backup`, {
    headers: { Authorization: `Bearer ${adminToken}`, "x-zovik-admin-request": "1" },
  });
  assert(authExportBackup.status === 200, "GET /api/admin/governance/export?type=full_backup returns 200");
  const backupRespJson = await authExportBackup.json();
  assert(backupRespJson.metadata?.platform === "Zovik AI", "Full backup endpoint returns valid Zovik AI archive metadata");

  // Summary
  console.log("\n=================================================");
  console.log(`📊 PHASE 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error("💥 Unhandled Phase 5 Test Exception:", err);
  process.exit(1);
});
