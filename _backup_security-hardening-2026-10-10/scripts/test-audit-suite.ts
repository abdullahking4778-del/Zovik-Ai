import { checkQuotaAllowed, consumeQuotaOnSuccess, getAuthoritativeIdentifier } from "../src/lib/quotaManager";

console.log("=== RUNNING ZOVIK AI AUDIT VALIDATION SUITE ===");


// 3. Quota Deduct-on-Success Test (Chat)
const testChatId = `test_chat_${Date.now()}`;
const initialChatCheck = checkQuotaAllowed("chat", testChatId, "free");
if (!initialChatCheck.allowed || initialChatCheck.limit !== 20 || initialChatCheck.remaining !== 20) {
  throw new Error(`Chat quota check failed: ${JSON.stringify(initialChatCheck)}`);
}
console.log("✓ Initial chat quota check allowed (20 remaining, not deducted).");

// Check again to ensure checkQuotaAllowed did NOT prematurely deduct
const secondChatCheck = checkQuotaAllowed("chat", testChatId, "free");
if (secondChatCheck.remaining !== 20) {
  throw new Error("Premature deduction occurred during checkQuotaAllowed!");
}
console.log("✓ Deduct-on-success verified: No premature deduction during check.");

// Now consume on success
const consumed1 = consumeQuotaOnSuccess("chat", testChatId, "free");
if (consumed1.remaining !== 19) {
  throw new Error(`Expected remaining 19, got ${consumed1.remaining}`);
}
console.log("✓ consumeQuotaOnSuccess correctly decremented remaining to 19.");

// 4. Photo Quota Test (Free vs Plus vs VIP)
const testFreePhotoId = `test_photo_free_${Date.now()}`;
const freePhotoCheck = checkQuotaAllowed("photo", testFreePhotoId, "free");
if (freePhotoCheck.allowed !== false || freePhotoCheck.limit !== 0) {
  throw new Error("Free tier was incorrectly allowed photo access!");
}
console.log("✓ Free tier photo access blocked (limit = 0).");

const testPlusPhotoId = `test_photo_plus_${Date.now()}`;
const plusPhotoCheck = checkQuotaAllowed("photo", testPlusPhotoId, "plus");
if (!plusPhotoCheck.allowed || plusPhotoCheck.limit !== 5 || plusPhotoCheck.remaining !== 5) {
  throw new Error(`Plus photo check failed: ${JSON.stringify(plusPhotoCheck)}`);
}
console.log("✓ Plus tier photo access verified (limit = 5).");

const testVipPhotoId = `test_photo_vip_${Date.now()}`;
const vipPhotoCheck = checkQuotaAllowed("photo", testVipPhotoId, "vip");
if (!vipPhotoCheck.allowed || vipPhotoCheck.limit !== 10 || vipPhotoCheck.remaining !== 10) {
  throw new Error(`VIP photo check failed: ${JSON.stringify(vipPhotoCheck)}`);
}
console.log("✓ VIP tier photo access verified (limit = 10).");

console.log("\nALL AUDIT VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀");
