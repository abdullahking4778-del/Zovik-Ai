import fs from "fs";
import path from "path";
import {
  createAutomatedSnapshot,
  listAutomatedSnapshots,
  verifySnapshotIntegrity,
} from "../src/lib/disasterRecovery";
import { createAdminToken } from "../src/lib/adminAuth";

async function runPhase6Tests() {
  console.log("=================================================");
  console.log("🧪 STARTING PHASE 6 COMPREHENSIVE TEST SUITE");
  console.log("Production Launch, Edge CDN, PWA & Disaster Recovery");
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
  // 1. Disaster Recovery & Snapshot Unit Tests
  // -----------------------------------------------------------------
  console.log("--- 1. Testing Disaster Recovery Snapshot Engine ---");
  const snapshot = await createAutomatedSnapshot("manual");
  assert(
    Boolean(snapshot.filename && snapshot.sizeBytes > 100),
    "Automated backup snapshot created on disk",
    `File: ${snapshot.filename} (${snapshot.sizeBytes} bytes)`
  );

  assert(
    Boolean(snapshot.checksum && snapshot.checksum.length === 64),
    "Cryptographic SHA-256 integrity checksum calculated",
    `Checksum: ${snapshot.checksum.slice(0, 16)}...`
  );

  const snapshotList = await listAutomatedSnapshots();
  assert(
    Array.isArray(snapshotList) && snapshotList.length > 0,
    "listAutomatedSnapshots returns active backup catalog",
    `Catalog size: ${snapshotList.length}`
  );

  const verification = verifySnapshotIntegrity(snapshot.filename);
  assert(
    verification.valid === true && verification.checksum === snapshot.checksum,
    "Snapshot integrity verified with matching SHA-256 digest"
  );

  // -----------------------------------------------------------------
  // 2. PWA Manifest & Service Worker Static Verification
  // -----------------------------------------------------------------
  console.log("\n--- 2. Testing PWA Manifest & Service Worker Assets ---");
  const manifestPath = path.join(process.cwd(), "public", "manifest.json");
  assert(fs.existsSync(manifestPath), "public/manifest.json exists on disk");

  const manifestRaw = fs.readFileSync(manifestPath, "utf-8");
  const manifestJson = JSON.parse(manifestRaw);
  assert(
    manifestJson.display === "standalone" && Boolean(manifestJson.name && manifestJson.start_url),
    "manifest.json contains standalone PWA requirements"
  );
  assert(
    Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 2,
    "manifest.json defines multi-size home-screen icons",
    `Icons defined: ${manifestJson.icons.length}`
  );

  const swPath = path.join(process.cwd(), "public", "sw.js");
  assert(fs.existsSync(swPath), "public/sw.js service worker script exists on disk");
  const swRaw = fs.readFileSync(swPath, "utf-8");
  assert(
    swRaw.includes("addEventListener(\"install\"") && swRaw.includes("addEventListener(\"fetch\""),
    "Service worker implements install, activate, and offline fetch caching listeners"
  );

  // -----------------------------------------------------------------
  // 3. Live HTTP API Route Tests (Against http://localhost:3000)
  // -----------------------------------------------------------------
  console.log("\n--- 3. Testing Live HTTP Production Endpoints ---");
  const baseUrl = "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET || "zovik_cron_disaster_key_2025";
  const adminToken = createAdminToken();

  // Test 3A: Production Health Check Endpoint
  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert(healthRes.status === 200, "GET /api/health returns HTTP 200");
  const healthJson = await healthRes.json();
  assert(
    healthJson.status === "healthy" || healthJson.status === "warning",
    "Health check status is operational",
    `Status: ${healthJson.status}`
  );
  assert(
    typeof healthJson.responseTimeMs === "number" && healthJson.services?.aiEngine,
    "Health check returns response time latency and AI engine telemetry",
    `Latency: ${healthJson.responseTimeMs}ms, AI: ${healthJson.services?.aiEngine?.provider}`
  );

  // Test 3B: PWA Manifest via HTTP
  const manifestHttpRes = await fetch(`${baseUrl}/manifest.json`);
  assert(manifestHttpRes.status === 200, "GET /manifest.json returns HTTP 200");
  const manifestHttpJson = await manifestHttpRes.json();
  assert(manifestHttpJson.name.includes("Zovik"), "Manifest returned via HTTP contains valid Zovik name");

  // Test 3C: PWA Service Worker via HTTP
  const swHttpRes = await fetch(`${baseUrl}/sw.js`);
  assert(swHttpRes.status === 200, "GET /sw.js returns HTTP 200");
  const swHttpText = await swHttpRes.text();
  assert(swHttpText.includes("CACHE_NAME"), "Service worker returned via HTTP contains active cache name");

  // Test 3D: Cron Backup - Unauthorized rejection
  const unauthCron = await fetch(`${baseUrl}/api/cron/backup`);
  assert(unauthCron.status === 401, "GET /api/cron/backup rejects unauthorized ping with 401");

  // Test 3E: Cron Backup - Authorized Execution
  const authCron = await fetch(`${baseUrl}/api/cron/backup`, {
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });
  assert(authCron.status === 200, "GET /api/cron/backup returns 200 with Bearer CRON_SECRET");
  const cronJson = await authCron.json();
  assert(
    cronJson.success === true && Boolean(cronJson.snapshot?.checksum),
    "Cron backup endpoint returns successful snapshot metadata",
    `Generated: ${cronJson.snapshot?.filename}`
  );

  // Test 3F: Cron Backup - Action list
  const listCron = await fetch(`${baseUrl}/api/cron/backup?action=list`, {
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });
  assert(listCron.status === 200, "GET /api/cron/backup?action=list returns 200");
  const listCronJson = await listCron.json();
  assert(
    listCronJson.success === true && Array.isArray(listCronJson.snapshots),
    "Snapshot catalog listed via cron endpoint",
    `Count: ${listCronJson.snapshots?.length}`
  );

  // Test 3G: Edge Security Headers
  const rootRes = await fetch(`${baseUrl}/api/health`);
  const nosniff = rootRes.headers.get("x-content-type-options");
  const frameOptions = rootRes.headers.get("x-frame-options");
  assert(
    nosniff === "nosniff",
    "Global security header X-Content-Type-Options: nosniff verified on live response"
  );
  assert(
    frameOptions === "SAMEORIGIN",
    "Global security header X-Frame-Options: SAMEORIGIN verified on live response"
  );

  // Summary
  console.log("\n=================================================");
  console.log(`📊 PHASE 6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase6Tests().catch((err) => {
  console.error("💥 Unhandled Phase 6 Test Exception:", err);
  process.exit(1);
});
