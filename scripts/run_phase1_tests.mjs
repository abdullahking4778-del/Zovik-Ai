import assert from "assert";
import fs from "fs";
import path from "path";

// Color helpers for terminal output
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

console.log(bold(cyan("\n=======================================================")));
console.log(bold(cyan("   ZOVIK AI — PHASE 1 (EVENTS & FLAGS) TEST SUITE   ")));
console.log(bold(cyan("=======================================================\n")));

let totalPassed = 0;
let totalFailed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ${green("✔")} ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ${red("✖")} ${name}`);
    console.error(`    ${red(err.message)}`);
    totalFailed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ${green("✔")} ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ${red("✖")} ${name}`);
    console.error(`    ${red(err.message)}`);
    totalFailed++;
  }
}

async function runTests() {
  console.log(bold("\n1. Testing Events Store Logic & Auto-Status Computation:"));

  const {
    computeEventStatus,
    getPersistentEvents,
    getActivePublicEvents,
    savePersistentEvent,
    deletePersistentEvent,
  } = await import("../src/lib/eventsStore.ts");

  it("computes 'draft' when isActive is false", () => {
    const status = computeEventStatus({
      id: "test",
      title: "Test",
      type: "weekly",
      status: "live",
      startDate: new Date(Date.now() - 10000).toISOString(),
      endDate: new Date(Date.now() + 10000).toISOString(),
      actionType: "open_premium",
      visibility: "all",
      priority: 1,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.strictEqual(status, "draft");
  });

  it("computes 'scheduled' when start date is in the future", () => {
    const status = computeEventStatus({
      id: "test",
      title: "Future Event",
      type: "seasonal",
      status: "draft",
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      actionType: "open_premium",
      visibility: "all",
      priority: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.strictEqual(status, "scheduled");
  });

  it("computes 'live' when current time falls within start and end dates", () => {
    const status = computeEventStatus({
      id: "test",
      title: "Live Event",
      type: "flash",
      status: "draft",
      startDate: new Date(Date.now() - 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 60 * 1000).toISOString(),
      actionType: "open_premium",
      visibility: "all",
      priority: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.strictEqual(status, "live");
  });

  it("computes 'ended' when end date has passed", () => {
    const status = computeEventStatus({
      id: "test",
      title: "Expired Event",
      type: "weekly",
      status: "live",
      startDate: new Date(Date.now() - 120 * 1000).toISOString(),
      endDate: new Date(Date.now() - 60 * 1000).toISOString(),
      actionType: "open_premium",
      visibility: "all",
      priority: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.strictEqual(status, "ended");
  });

  await itAsync("fetches default seed events when no custom data exists", async () => {
    const events = await getPersistentEvents();
    assert(Array.isArray(events), "Events should be an array");
    assert(events.length >= 2, "Should contain at least 2 default events");
  });

  const testEventId = `evt_test_${Date.now()}`;
  await itAsync("saves a new event and reads it back atomically", async () => {
    const saved = await savePersistentEvent({
      id: testEventId,
      title: "Automated Phase 1 Test Event",
      subtitle: "Testing CRUD",
      type: "flash",
      badge: "TEST 50% ⚡",
      startDate: new Date(Date.now() - 10000).toISOString(),
      endDate: new Date(Date.now() + 10000).toISOString(),
      priority: 99,
      isActive: true,
      visibility: "all",
      discountPercent: 50,
    });

    assert.strictEqual(saved.id, testEventId);
    assert.strictEqual(saved.title, "Automated Phase 1 Test Event");
    assert.strictEqual(saved.status, "live");

    const all = await getPersistentEvents();
    const found = all.find((e) => e.id === testEventId);
    assert(found, "Saved event must be present in persistent events");
    assert.strictEqual(found.discountPercent, 50);
  });

  await itAsync("getActivePublicEvents filters only live events and sorts by priority", async () => {
    const active = await getActivePublicEvents("free");
    assert(Array.isArray(active), "Active events should be array");
    for (const evt of active) {
      assert.strictEqual(evt.status, "live", "All public active events must have status 'live'");
      assert.strictEqual(evt.isActive, true, "All public active events must be active");
    }
    // Verify priority sorting (descending)
    for (let i = 0; i < active.length - 1; i++) {
      assert(
        active[i].priority >= active[i + 1].priority,
        "Active public events must be sorted by priority descending"
      );
    }
  });

  await itAsync("deletes an event by ID cleanly", async () => {
    const deleted = await deletePersistentEvent(testEventId);
    assert.strictEqual(deleted, true);

    const all = await getPersistentEvents();
    const found = all.find((e) => e.id === testEventId);
    assert.strictEqual(found, undefined, "Deleted event must no longer exist");
  });

  console.log(bold("\n2. Testing Feature Flags Store Logic & Runtime Toggles:"));

  const {
    getPersistentFeatureFlags,
    getPublicFeatureFlags,
    isFeatureEnabled,
    updatePersistentFeatureFlag,
    DEFAULT_FEATURE_FLAGS,
  } = await import("../src/lib/featureFlagsStore.ts");

  await itAsync("fetches all default feature flags", async () => {
    const flags = await getPersistentFeatureFlags();
    assert(Array.isArray(flags), "Flags must be an array");
    assert(flags.length >= DEFAULT_FEATURE_FLAGS.length, "Flags count must match or exceed defaults");

    const eventsFlag = flags.find((f) => f.key === "events_system_enabled");
    assert(eventsFlag, "events_system_enabled flag must exist");
    assert.strictEqual(eventsFlag.enabled, true);

    const maintFlag = flags.find((f) => f.key === "maintenance_mode");
    assert(maintFlag, "maintenance_mode flag must exist");
    assert.strictEqual(maintFlag.enabled, false);
  });

  await itAsync("getPublicFeatureFlags returns dictionary map", async () => {
    const map = await getPublicFeatureFlags();
    assert.strictEqual(typeof map, "object");
    assert.strictEqual(typeof map["events_system_enabled"], "boolean");
    assert.strictEqual(typeof map["maintenance_mode"], "boolean");
  });

  await itAsync("isFeatureEnabled correctly queries a specific flag", async () => {
    const isEvents = await isFeatureEnabled("events_system_enabled");
    assert.strictEqual(isEvents, true);

    const isMaint = await isFeatureEnabled("maintenance_mode");
    assert.strictEqual(isMaint, false);

    const nonExistent = await isFeatureEnabled("unknown_flag_xyz");
    assert.strictEqual(nonExistent, false);
  });

  await itAsync("updatePersistentFeatureFlag toggles a flag on and off reliably", async () => {
    // 1. Toggle maintenance_mode to true
    const updatedOn = await updatePersistentFeatureFlag("maintenance_mode", { enabled: true });
    assert.strictEqual(updatedOn.enabled, true);

    let isMaint = await isFeatureEnabled("maintenance_mode");
    assert.strictEqual(isMaint, true, "Maintenance mode should be active after update");

    // 2. Toggle maintenance_mode back to false (safety reset)
    const updatedOff = await updatePersistentFeatureFlag("maintenance_mode", { enabled: false });
    assert.strictEqual(updatedOff.enabled, false);

    isMaint = await isFeatureEnabled("maintenance_mode");
    assert.strictEqual(isMaint, false, "Maintenance mode must be off after reset");
  });

  console.log(bold("\n3. Testing Admin Security Guards on Phase 1 Endpoints:"));

  const { verifyAdminRequest } = await import("../src/lib/adminAuth.ts");

  it("verifyAdminRequest rejects requests without admin credentials or tokens", () => {
    const mockReq = {
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      cookies: {
        get: () => undefined,
      },
      method: "GET",
    };

    const isAuthorized = verifyAdminRequest(mockReq);
    assert.strictEqual(isAuthorized, false, "Must reject request without authorization");
  });

  it("verifyAdminRequest rejects mutating requests with invalid CSRF token", () => {
    const mockPostReq = {
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      cookies: {
        get: () => ({ value: "invalid.jwt.token" }),
      },
      method: "POST",
    };

    const isAuthorized = verifyAdminRequest(mockPostReq);
    assert.strictEqual(isAuthorized, false, "Must reject post without valid token and CSRF");
  });

  console.log(bold("\n4. Testing Phase 1 API Route Handlers:"));

  const { createAdminToken } = await import("../src/lib/adminAuth.ts");
  const validAdminToken = createAdminToken();

  // 1. Public Events API Route
  const { GET: getPublicEventsRoute } = await import("../src/app/api/events/route.ts");
  await itAsync("GET /api/events returns 200 with active events list", async () => {
    const req = new Request("http://localhost:3000/api/events");
    const res = await getPublicEventsRoute(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(Array.isArray(data.events));
  });

  // 2. Public Feature Flags API Route
  const { GET: getPublicFlagsRoute } = await import("../src/app/api/feature-flags/route.ts");
  await itAsync("GET /api/feature-flags returns 200 with flag map", async () => {
    const res = await getPublicFlagsRoute();
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(typeof data.flags === "object");
    assert.strictEqual(typeof data.flags.events_system_enabled, "boolean");
  });

  // 3. Admin Events API Route
  const { GET: getAdminEventsRoute, POST: postAdminEventsRoute, DELETE: deleteAdminEventsRoute } = await import("../src/app/api/admin/events/route.ts");
  await itAsync("GET /api/admin/events rejects unauthorized request with 401", async () => {
    const req = new Request("http://localhost:3000/api/admin/events");
    const res = await getAdminEventsRoute(req);
    assert.strictEqual(res.status, 401);
  });

  await itAsync("GET /api/admin/events returns 200 when authenticated", async () => {
    const req = new Request("http://localhost:3000/api/admin/events", {
      headers: {
        authorization: `Bearer ${validAdminToken}`,
        "x-zovik-admin-request": "1",
      },
    });
    const res = await getAdminEventsRoute(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(Array.isArray(data.events));
  });

  const apiTestEventId = `evt_api_test_${Date.now()}`;
  await itAsync("POST /api/admin/events creates a new event when authenticated", async () => {
    const req = new Request("http://localhost:3000/api/admin/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${validAdminToken}`,
        "x-zovik-admin-request": "1",
      },
      body: JSON.stringify({
        id: apiTestEventId,
        title: "API Created Event",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        type: "weekly",
      }),
    });
    const res = await postAdminEventsRoute(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.event.id, apiTestEventId);
  });

  await itAsync("DELETE /api/admin/events removes an event when authenticated", async () => {
    const req = new Request(`http://localhost:3000/api/admin/events?id=${apiTestEventId}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${validAdminToken}`,
        "x-zovik-admin-request": "1",
      },
    });
    const res = await deleteAdminEventsRoute(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });

  // 4. Admin Feature Flags API Route
  const { GET: getAdminFlagsRoute, POST: postAdminFlagsRoute } = await import("../src/app/api/admin/feature-flags/route.ts");
  await itAsync("GET /api/admin/feature-flags returns full flags list when authenticated", async () => {
    const req = new Request("http://localhost:3000/api/admin/feature-flags", {
      headers: {
        authorization: `Bearer ${validAdminToken}`,
        "x-zovik-admin-request": "1",
      },
    });
    const res = await getAdminFlagsRoute(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(Array.isArray(data.flags));
  });

  await itAsync("POST /api/admin/feature-flags toggles a flag safely", async () => {
    const req = new Request("http://localhost:3000/api/admin/feature-flags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${validAdminToken}`,
        "x-zovik-admin-request": "1",
      },
      body: JSON.stringify({
        key: "ai_thinking_mode",
        enabled: true,
      }),
    });
    const res = await postAdminFlagsRoute(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.flag.key, "ai_thinking_mode");
  });

  // 5. Admin Analytics API Route
  const { GET: getAdminAnalyticsRoute } = await import("../src/app/api/admin/analytics/route.ts");
  await itAsync("GET /api/admin/analytics compiles live platform summary metrics", async () => {
    const req = new Request("http://localhost:3000/api/admin/analytics", {
      headers: {
        authorization: `Bearer ${validAdminToken}`,
        "x-zovik-admin-request": "1",
      },
    });
    const res = await getAdminAnalyticsRoute(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(typeof data.analytics.totalUsers === "number");
    assert(typeof data.analytics.totalRevenuePKR === "number");
    assert(typeof data.analytics.activeEventsCount === "number");
    assert(typeof data.analytics.activeFeatureFlagsCount === "number");
    assert.strictEqual(typeof data.analytics.health.database, "string");
  });

  console.log(bold("\n5. Summary of Test Results:"));
  console.log(`  Total Passed: ${green(totalPassed.toString())}`);
  console.log(`  Total Failed: ${totalFailed > 0 ? red(totalFailed.toString()) : "0"}`);

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    console.log(bold(green("\nAll Phase 1 End-to-End Tests PASSED 100%! 🚀\n")));
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
