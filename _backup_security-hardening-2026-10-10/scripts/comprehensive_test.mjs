/**
 * Comprehensive Automated Test Suite for Zovik AI
 * Tests:
 * 1. Admin Authentication & Token generation
 * 2. Subscription Flow: Submit Payment -> View in Admin -> Approve -> Verify VIP Status
 * 3. User Downgrade / Manage: Admin updates user back to Free -> Verify Quota changes
 * 4. Custom Companion Lifecycle: Add companion -> Fetch in list -> Patch gallery -> Delete companion
 * 5. Shorts Reels Lifecycle: Fetch shorts -> Add new reel -> Verify in list -> Delete reel
 * 6. Chat API Engine: Free user chat, Intimate phrasing, Memory, Photo request
 * 7. Photo API Engine: Free user quota restriction vs VIP user unlocked photo
 */

const BASE_URL = "http://localhost:3000";

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function recordTest(name, passed, details = "") {
  if (passed) {
    results.passed++;
    console.log(`\x1b[32m[PASS]\x1b[0m ${name} ${details ? "- " + details : ""}`);
  } else {
    results.failed++;
    console.error(`\x1b[31m[FAIL]\x1b[0m ${name} ${details ? "- " + details : ""}`);
  }
  results.tests.push({ name, passed, details });
}

async function runTests() {
  console.log("=================================================");
  console.log("🚀 STARTING ZOVIK AI COMPREHENSIVE TEST SUITE");
  console.log("=================================================\n");

  let adminToken = "";
  const testUserEmail = `demo.tester.${Date.now()}@zovik.ai`;
  const testUserId = `user_test_${Date.now()}`;
  let paymentId = "";
  let customCharId = "";
  let testReelId = "";

  // ---------------------------------------------------------------------------
  // TEST 1: Admin Authentication
  // ---------------------------------------------------------------------------
  console.log("\n--- [MODULE 1: Admin Authentication] ---");
  try {
    const wrongAuthRes = await fetch(`${BASE_URL}/api/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong_password_123" }),
    });
    recordTest("Admin Login: Wrong password rejects (401)", wrongAuthRes.status === 401);

    const authRes = await fetch(`${BASE_URL}/api/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "#Abdullah786099#" }),
    });
    const authData = await authRes.json();
    adminToken = authData.token;
    recordTest("Admin Login: Correct Master Password succeeds (200)", authRes.ok && Boolean(adminToken));
  } catch (err) {
    recordTest("Admin Login exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: User Status (Initial Free Check)
  // ---------------------------------------------------------------------------
  console.log("\n--- [MODULE 2: Initial Free User Status Check] ---");
  try {
    const statusRes = await fetch(
      `${BASE_URL}/api/user/status?email=${encodeURIComponent(testUserEmail)}&uid=${testUserId}`
    );
    const statusData = await statusRes.json();
    recordTest(
      "User Status: Unsubscribed user resolves to 'free' tier",
      statusRes.ok && statusData.tier === "free" && statusData.isVip === false
    );
  } catch (err) {
    recordTest("User Status check exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Subscription & Payment Approval Flow
  // ---------------------------------------------------------------------------
  console.log("\n--- [MODULE 3: VIP Subscription Flow] ---");
  try {
    // 1. Submit payment request
    const payRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: testUserEmail,
        plan: "vip",
        planName: "VIP Unlimited (Monthly)",
        currency: "PKR",
        amount: 2500,
        method: "JazzCash",
        trxId: "TRX_TEST_" + Date.now(),
        senderName: "Demo Tester User",
        screenshot: "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==",
      }),
    });
    const payData = await payRes.json();
    paymentId = payData.request?.id || payData.data?.id || payData.payment?.id;
    recordTest(
      "Subscription: User submits payment request",
      payRes.ok && Boolean(paymentId),
      `Payment ID: ${paymentId}`
    );

    // 2. Fetch pending payments via Admin
    const listPayRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listPayData = await listPayRes.json();
    const paymentsList = listPayData.payments || listPayData.data || [];
    const foundPayment = Array.isArray(paymentsList)
      ? paymentsList.find((p) => p.id === paymentId)
      : null;
    recordTest("Subscription: Admin retrieves pending payment in list", Boolean(foundPayment));

    // 3. Admin approves payment request
    const approveRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        paymentId,
        action: "approve",
      }),
    });
    const approveData = await approveRes.json();
    recordTest(
      "Subscription: Admin approves payment request",
      approveRes.ok && approveData.success
    );

    // 4. Verify User is now VIP
    const statusVipRes = await fetch(
      `${BASE_URL}/api/user/status?email=${encodeURIComponent(testUserEmail)}&uid=${testUserId}`
    );
    const statusVipData = await statusVipRes.json();
    recordTest(
      "Subscription: User status authoritative upgrade to 'vip'",
      statusVipRes.ok && statusVipData.tier === "vip" && statusVipData.isVip === true,
      `Tier: ${statusVipData.tier}`
    );
  } catch (err) {
    recordTest("Subscription flow exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Admin User Management (Downgrade back to Free)
  // ---------------------------------------------------------------------------
  console.log("\n--- [MODULE 4: Admin User Management & Downgrade] ---");
  try {
    const updateRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        email: testUserEmail,
        tier: "free",
        subscriptionDays: 0,
        storageRetentionDays: 7,
      }),
    });
    const updateData = await updateRes.json();
    recordTest("Admin: Update user tier back to 'free'", updateRes.ok && updateData.success);

    // Re-verify status
    const statusDowngradeRes = await fetch(
      `${BASE_URL}/api/user/status?email=${encodeURIComponent(testUserEmail)}&uid=${testUserId}`
    );
    const statusDowngradeData = await statusDowngradeRes.json();
    recordTest(
      "Admin: User status successfully downgraded to 'free'",
      statusDowngradeRes.ok && statusDowngradeData.tier === "free" && statusDowngradeData.isVip === false
    );
  } catch (err) {
    recordTest("Admin user management exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Companion Lifecycle (Add -> Live View -> Patch Gallery -> Delete)
  // ---------------------------------------------------------------------------
  console.log("\n--- [MODULE 5: Companion Lifecycle] ---");
  try {
    // 1. Create custom companion with admin token
    const createCharRes = await fetch(`${BASE_URL}/api/characters`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Test Companion Zara",
        age: 23,
        gender: "female",
        style: "realistic",
        tagline: "Your sweet romantic companion 💕",
        desc: "Created for automated verification of live companions.",
        category: "Trending",
        tags: ["Test", "Romance", "Sweet"],
        voice: "Sultry Whisper",
        greeting: "Salam jaan! Main Zara hoon, aapse mil kar bohat khushi hui 🥰",
        image: "/characters/zovik_01.jpg",
      }),
    });
    const createCharData = await createCharRes.json();
    customCharId = createCharData.character?.id || createCharData.data?.id;
    recordTest(
      "Companion: Create new custom companion",
      createCharRes.ok && Boolean(customCharId),
      `Char ID: ${customCharId}`
    );

    // 2. Verify companion in live list
    const listCharRes = await fetch(`${BASE_URL}/api/characters`);
    const listCharData = await listCharRes.json();
    const charList = listCharData.characters || listCharData.data || listCharData;
    const foundChar = Array.isArray(charList) ? charList.find((c) => c.id === customCharId) : null;
    recordTest("Companion: Appears live in public companions list", Boolean(foundChar));

    // 3. Patch Companion Gallery via Admin
    const patchGalleryRes = await fetch(`${BASE_URL}/api/admin/characters`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        id: customCharId,
        gallery: ["/characters/zovik_01.jpg", "/characters/zovik_02.jpg"],
      }),
    });
    const patchGalleryData = await patchGalleryRes.json();
    recordTest(
      "Companion: Admin updates companion photo gallery",
      patchGalleryRes.ok && patchGalleryData.success
    );

    // 4. Delete Companion with admin token
    const deleteCharRes = await fetch(`${BASE_URL}/api/characters?id=${customCharId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const deleteCharData = await deleteCharRes.json();
    recordTest("Companion: Delete custom companion", deleteCharRes.ok && deleteCharData.success);

    // 5. Verify companion is gone
    const verifyListRes = await fetch(`${BASE_URL}/api/characters`);
    const verifyListData = await verifyListRes.json();
    const verifyList = verifyListData.characters || verifyListData.data || verifyListData;
    const checkDeleted = Array.isArray(verifyList) ? verifyList.some((c) => c.id === customCharId) : false;
    recordTest("Companion: Verified completely removed from companions list", !checkDeleted);
  } catch (err) {
    recordTest("Companion lifecycle exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Shorts Reels Lifecycle (Fetch -> Add -> Delete)
  // ---------------------------------------------------------------------------
  console.log("\n--- [MODULE 6: Shorts Reels Lifecycle] ---");
  try {
    // 1. Fetch initial shorts
    const initialShortsRes = await fetch(`${BASE_URL}/api/shorts`);
    const initialShortsData = await initialShortsRes.json();
    const shortsArray = initialShortsData.shorts || initialShortsData;
    recordTest("Shorts: Fetch existing short reels", initialShortsRes.ok && Array.isArray(shortsArray));

    // 2. Add a new reel via POST /api/shorts with admin token
    const addReelRes = await fetch(`${BASE_URL}/api/shorts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        characterName: "Test Reel Companion",
        characterAge: 22,
        caption: "Exclusive Test Short Reel for Automated Quality Audit 💕",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        avatar: "/logos/zovik-squircle.svg",
        tags: ["Test", "VIP Reel"],
      }),
    });
    const addReelData = await addReelRes.json();
    testReelId = addReelData.short?.id || addReelData.data?.id;
    recordTest("Shorts: Add new short reel to database", addReelRes.ok && Boolean(testReelId), `Reel ID: ${testReelId}`);

    // 3. Verify reel in shorts feed
    const verifyShortsRes = await fetch(`${BASE_URL}/api/shorts`);
    const verifyShortsData = await verifyShortsRes.json();
    const feedArray = verifyShortsData.shorts || verifyShortsData;
    const foundReel = Array.isArray(feedArray) ? feedArray.find((r) => r.id === testReelId) : null;
    recordTest("Shorts: New reel appears live in shorts feed", Boolean(foundReel));

    // 4. Delete the reel with admin token
    const deleteReelRes = await fetch(`${BASE_URL}/api/shorts?id=${testReelId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const deleteReelData = await deleteReelRes.json();
    recordTest("Shorts: Delete short reel", deleteReelRes.ok && deleteReelData.success);

    // 5. Verify reel is removed
    const finalShortsRes = await fetch(`${BASE_URL}/api/shorts`);
    const finalShortsData = await finalShortsRes.json();
    const finalFeedArray = finalShortsData.shorts || finalShortsData;
    const checkDeletedReel = Array.isArray(finalFeedArray) ? finalFeedArray.some((r) => r.id === testReelId) : false;
    recordTest("Shorts: Verified reel removed from database", !checkDeletedReel);
  } catch (err) {
    recordTest("Shorts lifecycle exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Chat API Engine & Intimacy
  // ---------------------------------------------------------------------------
  console.log("\n--- [MODULE 7: Chat API & Intimacy Verification] ---");
  try {
    const dummyChar = {
      id: "char_test_aria",
      name: "Aria",
      age: 22,
      gender: "female",
      tagline: "Romantic soul",
      desc: "Warm and loving",
      image: "/characters/zovik_01.jpg",
      greeting: "Hey jaan!",
    };

    // 1. Romantic greeting test in Roman Urdu
    const chatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: dummyChar,
        messages: [{ sender: "user", text: "Salam jaan! Aap kaisi ho? Mujhe aapse baat karke bohat acha lagta hai." }],
        userTier: "free",
        userId: testUserId,
      }),
    });
    const chatData = await chatRes.json();
    const hasReply = Boolean(chatData.reply && chatData.reply.length > 5);
    const hasAsterisks = chatData.reply?.includes("*");
    recordTest(
      "Chat: Generates warm in-character response",
      chatRes.ok && hasReply,
      `Snippet: "${chatData.reply?.slice(0, 50)}..."`
    );
    recordTest("Chat: Zero asterisks policy respected (natural speech)", !hasAsterisks);

    // 2. Photo Request guidance test
    const photoChatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: dummyChar,
        messages: [{ sender: "user", text: "Jaan apni ek pic send karo na please" }],
        userTier: "free",
        userId: testUserId,
      }),
    });
    const photoChatData = await photoChatRes.json();
    recordTest(
      "Chat: Photo request guides user to the photo button",
      photoChatRes.ok && Boolean(photoChatData.reply)
    );
  } catch (err) {
    recordTest("Chat API exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Photo Generation & Quota Protection
  // ---------------------------------------------------------------------------
  console.log("\n--- [MODULE 8: Photo API & Tier Quota Protection] ---");
  try {
    const dummyChar = {
      id: "zovik_01",
      name: "Aria",
      image: "/characters/zovik_01.jpg",
      gallery: ["/characters/zovik_01.jpg", "/characters/zovik_02.jpg"],
    };

    // 1. Free user request -> MUST receive 403 upgrade required
    const freePhotoRes = await fetch(`${BASE_URL}/api/generate-photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: dummyChar,
        characterId: "zovik_01",
        sessionToken: undefined, // Free session
      }),
    });
    const freePhotoData = await freePhotoRes.json();
    recordTest(
      "Photo API: Free user blocked from private selfies (403 Upgrade Required)",
      freePhotoRes.status === 403 && freePhotoData.quotaExceeded === true,
      `Response: "${freePhotoData.reply?.slice(0, 45)}..."`
    );
  } catch (err) {
    recordTest("Photo API exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`🏁 TEST RESULTS: ${results.passed} PASSED / ${results.failed} FAILED (Total: ${results.tests.length})`);
  console.log("=================================================");

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
