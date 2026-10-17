import {
  getAnalyticsOverview,
  getContentCalendarItems,
  detectCalendarConflicts,
  getPersistentExperiments,
  updatePersistentExperiment,
} from "../src/lib/analyticsStore";
import { ContentCalendarItem } from "../src/types";
import { createAdminToken } from "../src/lib/adminAuth";

async function runPhase4Tests() {
  console.log("=================================================");
  console.log("🧪 STARTING PHASE 4 COMPREHENSIVE TEST SUITE");
  console.log("Intelligence, Analytics & Visual Content Calendar");
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
  // 1. Direct Store Logic Unit Tests
  // -----------------------------------------------------------------
  console.log("--- 1. Testing Analytics Overview Logic ---");
  const overview = await getAnalyticsOverview();

  assert(
    typeof overview.revenue.totalApprovedPKR === "number" && overview.revenue.totalApprovedPKR >= 0,
    "Revenue calculation returns non-negative approved PKR",
    `PKR: ${overview.revenue.totalApprovedPKR}`
  );
  assert(
    typeof overview.revenue.totalApprovedUSD === "number" && overview.revenue.totalApprovedUSD >= 0,
    "Revenue calculation returns valid USD conversion",
    `USD: ${overview.revenue.totalApprovedUSD}`
  );
  assert(
    typeof overview.revenue.pendingCount === "number" && typeof overview.revenue.approvedCount === "number",
    "Payment counters (pending & approved) exist and are numbers"
  );
  assert(
    overview.activity.totalRegisteredUsers > 0 && overview.activity.totalChatMessages > 0,
    "Activity counters reflect registered users and messages",
    `Users: ${overview.activity.totalRegisteredUsers}, Messages: ${overview.activity.totalChatMessages}`
  );
  assert(
    overview.activity.coinsInCirculation > 0 && overview.activity.coinsBurned24h > 0,
    "Coin circulation and 24h burn telemetry calculated",
    `Circulating: ${overview.activity.coinsInCirculation}, Burned: ${overview.activity.coinsBurned24h}`
  );

  console.log("\n--- 2. Testing Top Companions Ranking ---");
  assert(
    Array.isArray(overview.topCompanions) && overview.topCompanions.length > 0,
    "Top companions array is populated",
    `Count: ${overview.topCompanions.length}`
  );

  // Verify companions are strictly sorted descending by engagementScore
  let isSorted = true;
  for (let i = 0; i < overview.topCompanions.length - 1; i++) {
    if (overview.topCompanions[i].engagementScore < overview.topCompanions[i + 1].engagementScore) {
      isSorted = false;
      break;
    }
  }
  assert(isSorted, "Top companions are ordered by engagementScore descending");

  const topOne = overview.topCompanions[0];
  assert(
    Boolean(topOne.name && topOne.image && topOne.chatCount && topOne.messageCount),
    "Top companion has complete profile & chat volume metadata",
    `#1 Companion: ${topOne.name} (${topOne.chatCount} chats, score ${topOne.engagementScore})`
  );

  console.log("\n--- 3. Testing User Cohorts & Segmentation ---");
  assert(
    Array.isArray(overview.userCohorts) && overview.userCohorts.length >= 4,
    "User cohorts array contains key segment groups",
    `Found ${overview.userCohorts.length} cohorts`
  );

  const cohortIds = overview.userCohorts.map((c) => c.id);
  assert(
    cohortIds.includes("new_users") &&
      cohortIds.includes("vip_subscribers") &&
      cohortIds.includes("power_users") &&
      cohortIds.includes("inactive_users"),
    "All essential cohorts present (New, VIP, Power, Inactive)"
  );

  const newCohort = overview.userCohorts.find((c) => c.id === "new_users");
  assert(
    Boolean(newCohort && newCohort.count > 0 && newCohort.recommendedAction),
    "Cohort includes counts and actionable retention recommendations",
    `New users: ${newCohort?.count} (${newCohort?.recommendedAction})`
  );

  console.log("\n--- 4. Testing Promo Code ROI Breakdown ---");
  assert(
    Array.isArray(overview.promoROI) && overview.promoROI.length > 0,
    "Promo code ROI metrics calculated from active offers"
  );
  const sampleROI = overview.promoROI[0];
  assert(
    sampleROI !== undefined && typeof sampleROI.estimatedRevenuePKR === "number",
    "Promo ROI includes financial attribution (discount & net revenue)",
    `Code: ${sampleROI.code}, Est Revenue: Rs. ${sampleROI.estimatedRevenuePKR}`
  );

  console.log("\n--- 5. Testing Content Calendar Aggregation ---");
  const calendarItems = await getContentCalendarItems();
  assert(
    Array.isArray(calendarItems) && calendarItems.length > 0,
    "Calendar items aggregated across events, offers, and drops",
    `Total scheduled items: ${calendarItems.length}`
  );

  const hasEvent = calendarItems.some((i) => i.type === "event");
  const hasOffer = calendarItems.some((i) => i.type === "offer");
  assert(hasEvent, "Calendar includes scheduled events");
  assert(hasOffer, "Calendar includes scheduled promo offers");

  // Verify chronological sorting
  let isChronological = true;
  for (let i = 0; i < calendarItems.length - 1; i++) {
    const timeA = new Date(calendarItems[i].startDate).getTime();
    const timeB = new Date(calendarItems[i + 1].startDate).getTime();
    if (timeA > timeB) {
      isChronological = false;
      break;
    }
  }
  assert(isChronological, "Calendar items are sorted chronologically by startDate");

  console.log("\n--- 6. Testing Calendar Conflict Detection Engine ---");
  // Test conflict detector with simulated overlapping flash items
  const now = new Date();
  const testOverlappingItems: ContentCalendarItem[] = [
    {
      id: "test_event_1",
      title: "Flash Mega Sale A",
      type: "event",
      startDate: new Date(now.getTime() - 1000).toISOString(),
      endDate: new Date(now.getTime() + 86400000).toISOString(),
      status: "live",
      color: "#0ea5e9",
      metadata: { eventType: "flash" },
    },
    {
      id: "test_event_2",
      title: "Flash Mega Sale B",
      type: "event",
      startDate: new Date(now.getTime()).toISOString(),
      endDate: new Date(now.getTime() + 86400000 * 2).toISOString(),
      status: "live",
      color: "#f53b70",
      metadata: { eventType: "flash" },
    },
    {
      id: "test_drop_1",
      title: "Drop Character Alpha",
      type: "drop",
      startDate: new Date(now.getTime()).toISOString(),
      endDate: new Date(now.getTime() + 86400000).toISOString(),
      status: "live",
      color: "#a855f7",
    },
    {
      id: "test_drop_2",
      title: "Drop Character Beta",
      type: "drop",
      startDate: new Date(now.getTime()).toISOString(),
      endDate: new Date(now.getTime() + 86400000).toISOString(),
      status: "live",
      color: "#a855f7",
    },
  ];

  const detectedConflicts = detectCalendarConflicts(testOverlappingItems);
  assert(
    detectedConflicts.length >= 2,
    "Conflict detector accurately flagged overlapping flash events & character drops",
    `Conflicts detected: ${detectedConflicts.length}`
  );

  const flashConflict = detectedConflicts.find((c) => c.severity === "high");
  assert(
    flashConflict !== undefined && flashConflict.recommendation.length > 10,
    "High severity conflict includes smart staggering recommendation",
    flashConflict?.recommendation
  );

  console.log("\n--- 7. Testing A/B Testing Store & Winner Selection ---");
  const exps = await getPersistentExperiments();
  assert(Array.isArray(exps) && exps.length >= 2, "A/B experiments seeded and accessible");

  const testExp = exps[0];
  const updatedExp = await updatePersistentExperiment(testExp.id, {
    winner: "A",
  });
  assert(updatedExp?.winner === "A", "Experiment winner updated to Variant A");

  // Re-verify from disk/cache
  const refreshedExps = await getPersistentExperiments();
  const refreshedTestExp = refreshedExps.find((e) => e.id === testExp.id);
  assert(refreshedTestExp?.winner === "A", "Updated experiment winner persisted");

  // Restore to original winner
  await updatePersistentExperiment(testExp.id, { winner: testExp.winner });

  // -----------------------------------------------------------------
  // 8. Live HTTP API Route Tests (Against http://localhost:3000)
  // -----------------------------------------------------------------
  console.log("\n--- 8. Testing Live HTTP API Endpoints ---");
  const baseUrl = "http://localhost:3000";
  const adminToken = createAdminToken();

  // Test 8A: Unauthorized requests rejected
  const unauthRes = await fetch(`${baseUrl}/api/admin/analytics`);
  assert(unauthRes.status === 401, "GET /api/admin/analytics rejects unauthorized requests with 401");

  const unauthCalRes = await fetch(`${baseUrl}/api/admin/calendar`);
  assert(unauthCalRes.status === 401, "GET /api/admin/calendar rejects unauthorized requests with 401");

  const unauthExpRes = await fetch(`${baseUrl}/api/admin/experiments`);
  assert(unauthExpRes.status === 401, "GET /api/admin/experiments rejects unauthorized requests with 401");

  // Test 8B: Authorized GET /api/admin/analytics
  const authAnalyticsRes = await fetch(`${baseUrl}/api/admin/analytics`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "x-zovik-admin-request": "1",
    },
  });
  assert(
    authAnalyticsRes.status === 200,
    "GET /api/admin/analytics returns 200 with valid admin credentials",
    `Status: ${authAnalyticsRes.status}`
  );

  const analyticsJson = await authAnalyticsRes.json();
  assert(
    analyticsJson.success === true && Boolean(analyticsJson.analytics),
    "Analytics API payload contains valid analytics object"
  );

  // Test 8C: Authorized GET /api/admin/calendar
  const authCalRes = await fetch(`${baseUrl}/api/admin/calendar`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "x-zovik-admin-request": "1",
    },
  });
  assert(
    authCalRes.status === 200,
    "GET /api/admin/calendar returns 200 with valid admin credentials",
    `Status: ${authCalRes.status}`
  );

  const calJson = await authCalRes.json();
  assert(
    calJson.success === true && Array.isArray(calJson.items) && Array.isArray(calJson.conflicts),
    "Calendar API payload contains items and conflicts array",
    `Items: ${calJson.items.length}, Conflicts: ${calJson.conflicts.length}`
  );

  // Test 8D: Authorized GET & POST /api/admin/experiments
  const authExpRes = await fetch(`${baseUrl}/api/admin/experiments`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "x-zovik-admin-request": "1",
    },
  });
  assert(authExpRes.status === 200, "GET /api/admin/experiments returns 200");
  const expJson = await authExpRes.json();
  assert(
    expJson.success === true && Array.isArray(expJson.experiments),
    "Experiments API payload returns experiments array"
  );

  // POST update via HTTP
  const postExpRes = await fetch(`${baseUrl}/api/admin/experiments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
      "x-zovik-admin-request": "1",
    },
    body: JSON.stringify({
      id: testExp.id,
      winner: "B",
    }),
  });
  assert(postExpRes.status === 200, "POST /api/admin/experiments updates winner via HTTP");

  // Summary
  console.log("\n=================================================");
  console.log(`📊 PHASE 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase4Tests().catch((err) => {
  console.error("💥 Unhandled Test Runner Exception:", err);
  process.exit(1);
});
