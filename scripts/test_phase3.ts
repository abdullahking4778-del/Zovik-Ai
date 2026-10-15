import {
  getPersistentNotifications,
  savePersistentNotification,
  deletePersistentNotification,
  markNotificationRead,
  getSmartBannerConfig,
  saveSmartBannerConfig,
  getPromoModalConfig,
  savePromoModalConfig,
} from "../src/lib/engagementStore";
import { createAdminToken } from "../src/lib/adminAuth";

async function runPhase3Tests() {
  console.log("=================================================");
  console.log("🧪 STARTING PHASE 3 COMPREHENSIVE TEST SUITE");
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
  console.log("--- 1. Testing Engagement Store Logic ---");
  const initialNotifs = await getPersistentNotifications();
  assert(Array.isArray(initialNotifs) && initialNotifs.length >= 3, "Seed notifications are populated", `Found ${initialNotifs.length}`);

  const welcomeNotif = initialNotifs.find((n) => n.id === "notif_welcome");
  assert(welcomeNotif !== undefined && welcomeNotif.type === "info", "notif_welcome exists with type info");

  // Save new test notification
  const tempNotif = await savePersistentNotification({
    title: "Phase 3 Unit Test Alert",
    message: "Automated test message for notifications engine.",
    type: "promo",
    targetAudience: "all",
    badge: "TEST",
    linkUrl: "/app",
    actionText: "Check Out",
    priority: "high",
    isActive: true,
  });
  assert(tempNotif.title === "Phase 3 Unit Test Alert", "Custom notification saved to store");

  // Mark notification as read
  const testEmail = `tester_${Date.now()}@zovik.ai`;
  const markOk = await markNotificationRead(tempNotif.id, testEmail);
  assert(markOk === true, "Notification marked as read for user");

  const refreshedList = await getPersistentNotifications();
  const foundRead = refreshedList.find((n) => n.id === tempNotif.id);
  assert(foundRead?.readBy?.includes(testEmail) ?? false, "User email recorded in readBy array");

  // Delete notification
  const delOk = await deletePersistentNotification(tempNotif.id);
  assert(delOk === true, "Notification deleted cleanly");

  // Smart Banner Config Test
  const banner = await getSmartBannerConfig();
  assert(banner !== null && typeof banner.title === "string", "Smart banner config loaded successfully");

  const updatedBanner = await saveSmartBannerConfig({
    title: "Updated Banner Test",
    countdownTarget: new Date(Date.now() + 86400000).toISOString(),
    isActive: true,
  });
  assert(updatedBanner.title === "Updated Banner Test", "Smart banner config updated successfully");

  // Promo Modal Config Test
  const modal = await getPromoModalConfig();
  assert(modal !== null && typeof modal.title === "string", "Promo modal config loaded successfully");

  const updatedModal = await savePromoModalConfig({
    title: "Updated Modal Test",
    badge: "TEST SPECIAL",
    isActive: true,
  });
  assert(updatedModal.title === "Updated Modal Test", "Promo modal config updated successfully");

  // -----------------------------------------------------------------
  // 2. HTTP Integration Tests on Live Dev Server
  // -----------------------------------------------------------------
  console.log("\n--- 2. Testing HTTP Endpoints on Dev Server (http://localhost:3000) ---");
  const baseUrl = "http://localhost:3000";

  // Public GET /api/notifications
  try {
    const resNotifs = await fetch(`${baseUrl}/api/notifications?user=${encodeURIComponent(testEmail)}`);
    const dataNotifs = await resNotifs.json();
    assert(resNotifs.status === 200 && Array.isArray(dataNotifs.notifications), "GET /api/notifications returns list", JSON.stringify(dataNotifs));
    assert(typeof dataNotifs.unreadCount === "number", "unreadCount is calculated in response", `Got ${dataNotifs.unreadCount}`);
  } catch (err: any) {
    assert(false, "GET /api/notifications request failed", err.message);
  }

  // Public POST /api/notifications/read
  try {
    const resRead = await fetch(`${baseUrl}/api/notifications/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "notif_welcome",
        user: testEmail,
      }),
    });
    const dataRead = await resRead.json();
    assert(resRead.status === 200 && dataRead.success === true, "POST /api/notifications/read marks notification as read");
  } catch (err: any) {
    assert(false, "POST /api/notifications/read request failed", err.message);
  }

  // Admin Security: Unauthorized GET /api/admin/notifications
  try {
    const resNoAuth = await fetch(`${baseUrl}/api/admin/notifications`);
    assert(resNoAuth.status === 401, "GET /api/admin/notifications denies unauthorized access (401)");
  } catch (err: any) {
    assert(false, "Admin security test failed", err.message);
  }

  // Admin Authorized GET /api/admin/notifications
  const adminToken = createAdminToken();
  const adminHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`,
    "x-zovik-admin-request": "1",
  };

  try {
    const resAuth = await fetch(`${baseUrl}/api/admin/notifications`, {
      headers: adminHeaders,
    });
    const dataAuth = await resAuth.json();
    assert(resAuth.status === 200 && Array.isArray(dataAuth.notifications), "GET /api/admin/notifications returns notifications when authorized");
  } catch (err: any) {
    assert(false, "Admin authorized fetch failed", err.message);
  }

  // Admin Authorized POST & DELETE Notification
  let createdNotifId = "";
  try {
    const resCreate = await fetch(`${baseUrl}/api/admin/notifications`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        title: "HTTP Test Broadcast",
        message: "Broadcasting through live HTTP admin endpoint.",
        type: "event",
        targetAudience: "all",
        badge: "LIVE",
        linkUrl: "/app",
      }),
    });
    const dataCreate = await resCreate.json();
    assert(resCreate.status === 200 && dataCreate.success === true, "POST /api/admin/notifications creates broadcast", JSON.stringify(dataCreate));
    createdNotifId = dataCreate.notification?.id;

    if (createdNotifId) {
      const resDel = await fetch(`${baseUrl}/api/admin/notifications?id=${createdNotifId}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      const dataDel = await resDel.json();
      assert(resDel.status === 200 && dataDel.success === true, "DELETE /api/admin/notifications deletes broadcast cleanly");
    }
  } catch (err: any) {
    assert(false, "Admin notifications CRUD test failed", err.message);
  }

  // Public GET /api/engagement/banner
  try {
    const resBanner = await fetch(`${baseUrl}/api/engagement/banner`);
    const dataBanner = await resBanner.json();
    assert(resBanner.status === 200 && dataBanner.success === true, "GET /api/engagement/banner returns banner & promo modal config");
    assert(dataBanner.banner !== undefined && dataBanner.promoModal !== undefined, "Response contains both banner and promoModal");
  } catch (err: any) {
    assert(false, "GET /api/engagement/banner failed", err.message);
  }

  // Admin GET & POST /api/admin/engagement/banner
  try {
    const resAdminBannerGet = await fetch(`${baseUrl}/api/admin/engagement/banner`, {
      headers: adminHeaders,
    });
    const dataAdminBannerGet = await resAdminBannerGet.json();
    assert(resAdminBannerGet.status === 200 && dataAdminBannerGet.success === true, "GET /api/admin/engagement/banner returns settings");

    const resAdminBannerPost = await fetch(`${baseUrl}/api/admin/engagement/banner`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        banner: {
          title: "Weekend Flash Sale: 50% Extra Coins with WELCOME50!",
          highlightText: "LIMITED TIME",
          badge: "FLASH DEAL",
          isActive: true,
        },
      }),
    });
    const dataAdminBannerPost = await resAdminBannerPost.json();
    assert(resAdminBannerPost.status === 200 && dataAdminBannerPost.success === true, "POST /api/admin/engagement/banner updates live banner");
  } catch (err: any) {
    assert(false, "Admin engagement banner test failed", err.message);
  }

  console.log("\n=================================================");
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch((e) => {
  console.error("Unhandled test runner exception:", e);
  process.exit(1);
});
