import {
  getPersistentOffers,
  savePersistentOffer,
  deletePersistentOffer,
  validateOfferCode,
  recordOfferRedemption,
} from "../src/lib/offersStore";
import { createAdminToken } from "../src/lib/adminAuth";

async function runPhase2Tests() {
  console.log("=================================================");
  console.log("🧪 STARTING PHASE 2 COMPREHENSIVE TEST SUITE");
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
  console.log("--- 1. Testing Offers Store Logic & Calculations ---");
  const initialOffers = await getPersistentOffers();
  assert(Array.isArray(initialOffers) && initialOffers.length >= 3, "Seed offers are populated", `Found ${initialOffers.length} offers`);

  const welcomeOffer = initialOffers.find((o) => o.code === "WELCOME50");
  assert(welcomeOffer !== undefined && welcomeOffer.discountType === "percentage", "WELCOME50 exists and is percentage discount");

  // Validate Percentage Discount
  const val1 = await validateOfferCode("WELCOME50", 1000, "testuser_phase2@zovik.ai", "free");
  assert(val1.valid === true, "WELCOME50 validates successfully for 1000 PKR");
  assert(val1.offer?.discountAmountPKR === 500, "50% discount correctly yields 500 PKR off", `Got ${val1.offer?.discountAmountPKR}`);
  assert(val1.offer?.finalPricePKR === 500, "Final price after 50% discount is 500 PKR", `Got ${val1.offer?.finalPricePKR}`);

  // Validate Min Purchase Requirement
  const valMin = await validateOfferCode("WELCOME50", 50, "testuser_phase2@zovik.ai", "free"); // WELCOME50 minPurchasePKR is 200
  assert(valMin.valid === false && (valMin.error?.includes("Minimum order") ?? false), "Below minimum order correctly rejected", valMin.error);

  // Validate Bonus Coins Discount Type
  const valBonus = await validateOfferCode("ZOVIK100", 500, "testuser_phase2@zovik.ai", "free");
  assert(valBonus.valid === true, "ZOVIK100 validates successfully");
  assert(valBonus.offer?.bonusCoins === 100, "ZOVIK100 awards 100 bonus coins", `Got ${valBonus.offer?.bonusCoins}`);

  // Validate Non-existent Code
  const valInvalid = await validateOfferCode("NONEXISTENT_CODE_XYZ", 1000);
  assert(valInvalid.valid === false, "Non-existent code rejected");

  // Test Offer Creation & Deletion
  const tempOffer = await savePersistentOffer({
    code: "UNIT_TEST_TMP",
    title: "Unit Test Temp Offer",
    description: "Temporary offer for testing",
    discountType: "flat_pkr",
    discountValue: 150,
    minPurchasePKR: 300,
    maxRedemptions: 5,
    perUserLimit: 2,
    validFrom: new Date(Date.now() - 3600000).toISOString(),
    validTo: new Date(Date.now() + 86400000).toISOString(),
    targetAudience: "all",
    isActive: true,
  });
  assert(tempOffer.code === "UNIT_TEST_TMP", "Custom offer saved to store");

  // Test Flat PKR Discount with isolated user email
  const isolatedEmail = `unit_tester_${Date.now()}@zovik.ai`;
  const valFlat = await validateOfferCode("UNIT_TEST_TMP", 500, isolatedEmail);
  assert(valFlat.valid === true, "Custom offer validates", valFlat.error);
  assert(valFlat.offer?.discountAmountPKR === 150, "Flat 150 PKR discount calculated", `Got ${valFlat.offer?.discountAmountPKR}`);
  assert(valFlat.offer?.finalPricePKR === 350, "Final price is 350 PKR", `Got ${valFlat.offer?.finalPricePKR}`);

  // Test Redemption Tracking & Per-User Limit
  await recordOfferRedemption("UNIT_TEST_TMP", isolatedEmail);
  await recordOfferRedemption("UNIT_TEST_TMP", isolatedEmail);

  // Third redemption should fail because perUserLimit is 2
  const valLimit = await validateOfferCode("UNIT_TEST_TMP", 500, isolatedEmail);
  assert(valLimit.valid === false && (valLimit.error?.includes("already redeemed") ?? false), "Per-user limit enforced after 2 uses", valLimit.error);

  // Clean up test offer
  await deletePersistentOffer(tempOffer.id);
  const currentOffers = await getPersistentOffers();
  const deletedCheck = currentOffers.find((o) => o.code === "UNIT_TEST_TMP");
  assert(deletedCheck === undefined, "Temporary offer deleted cleanly");

  // -----------------------------------------------------------------
  // 2. HTTP Integration Tests on Live Dev Server
  // -----------------------------------------------------------------
  console.log("\n--- 2. Testing HTTP Endpoints on Dev Server (http://localhost:3000) ---");
  const baseUrl = "http://localhost:3000";

  // Public Validation API: Valid Code
  try {
    const resVal = await fetch(`${baseUrl}/api/offers/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "WELCOME50",
        amountPKR: 2000,
        userEmail: "http_test@zovik.ai",
      }),
    });
    const dataVal = await resVal.json();
    assert(resVal.status === 200 && dataVal.valid === true, "POST /api/offers/validate accepts WELCOME50", JSON.stringify(dataVal));
    assert(dataVal.offer?.discountAmountPKR === 1000, "50% of 2000 PKR equals 1000 PKR discount", `Got ${dataVal.offer?.discountAmountPKR}`);
    assert(dataVal.offer?.finalPricePKR === 1000, "Final price equals 1000 PKR", `Got ${dataVal.offer?.finalPricePKR}`);
  } catch (err: any) {
    assert(false, "POST /api/offers/validate request failed", err.message);
  }

  // Public Validation API: Invalid Code
  try {
    const resInvalid = await fetch(`${baseUrl}/api/offers/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "INVALID_9999",
        amountPKR: 2000,
      }),
    });
    const dataInvalid = await resInvalid.json();
    assert(resInvalid.status === 200 && dataInvalid.valid === false, "POST /api/offers/validate rejects invalid code");
  } catch (err: any) {
    assert(false, "POST /api/offers/validate invalid code test failed", err.message);
  }

  // Admin Offers API: Auth Security Protection
  try {
    const resNoAuth = await fetch(`${baseUrl}/api/admin/offers`);
    assert(resNoAuth.status === 401, "GET /api/admin/offers denies unauthorized request (401)");
  } catch (err: any) {
    assert(false, "Admin security auth test failed", err.message);
  }

  // Generate Admin Token for Authorized Tests
  const adminToken = createAdminToken();
  const adminHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`,
    "x-zovik-admin-request": "1",
  };

  // Admin Offers API: Authorized GET
  try {
    const resAuth = await fetch(`${baseUrl}/api/admin/offers`, {
      headers: adminHeaders,
    });
    const dataAuth = await resAuth.json();
    assert(resAuth.status === 200 && Array.isArray(dataAuth.offers), "GET /api/admin/offers returns offers list when authorized");
  } catch (err: any) {
    assert(false, "Admin authorized fetch failed", err.message);
  }

  // Admin Offers API: Authorized POST (Create) and DELETE
  let createdOfferId = "";
  try {
    const resCreate = await fetch(`${baseUrl}/api/admin/offers`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        code: "HTTP_FLASH_40",
        title: "HTTP Flash 40% Off",
        description: "Integration test code",
        discountType: "percentage",
        discountValue: 40,
        minPurchasePKR: 100,
        maxRedemptions: 100,
        perUserLimit: 1,
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 86400000).toISOString(),
        targetAudience: "all",
        isActive: true,
      }),
    });
    const dataCreate = await resCreate.json();
    assert(resCreate.status === 200 && dataCreate.success === true, "POST /api/admin/offers creates new offer", JSON.stringify(dataCreate));
    createdOfferId = dataCreate.offer?.id;

    // Validate the newly created offer through public endpoint
    const resValNew = await fetch(`${baseUrl}/api/offers/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "HTTP_FLASH_40",
        amountPKR: 1000,
        userEmail: "new_buyer@zovik.ai",
      }),
    });
    const dataValNew = await resValNew.json();
    assert(dataValNew.valid === true && dataValNew.offer?.discountAmountPKR === 400, "Newly created HTTP_FLASH_40 validates with 400 PKR discount");

    // Clean up via DELETE
    if (createdOfferId) {
      const resDel = await fetch(`${baseUrl}/api/admin/offers?id=${createdOfferId}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      const dataDel = await resDel.json();
      assert(resDel.status === 200 && dataDel.success === true, "DELETE /api/admin/offers deletes offer cleanly");
    }
  } catch (err: any) {
    assert(false, "Admin CRUD integration test failed", err.message);
  }

  // Checkout Payment Submission with Promo Code Integration
  try {
    const resPayment = await fetch(`${baseUrl}/api/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "test_phase2_user",
        userEmail: "phase2_checkout@zovik.ai",
        plan: "pack_1000",
        planName: "1,050 Coins Pack (Discounted)",
        coins: 1050,
        currency: "PKR",
        amount: 500, // Discounted from 1000 to 500
        method: "EasyPaisa",
        trxId: "TRX_PHASE2_" + Date.now(),
        senderName: "Phase 2 Automated Tester",
        promoCode: "WELCOME50",
      }),
    });
    const dataPayment = await resPayment.json();
    assert(resPayment.status === 200 && dataPayment.success === true, "POST /api/subscriptions accepts payment with promoCode", JSON.stringify(dataPayment));
    assert(dataPayment.payment?.promoCode === "WELCOME50", "Payment record stored promoCode field successfully");
  } catch (err: any) {
    assert(false, "Subscriptions checkout integration test failed", err.message);
  }

  console.log("\n=================================================");
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((e) => {
  console.error("Unhandled test runner exception:", e);
  process.exit(1);
});
