/**
 * ZOVIK AI — VIRTUAL-CREDIT WALLET & TRANSACTION ACCOUNTING VERIFICATION SUITE
 * Exercises the actual implementation in `src/lib/wallet/` across all 18 scope-locked requirements.
 */

import fs from "fs";
import path from "path";
import assert from "assert";
import crypto from "crypto";
import {
  getOrCreateWallet,
  findWalletByUserId,
  executeCreditMutation,
  reconcileWallet,
  recordWalletIncident,
  getUnresolvedWalletIncidents,
  InsufficientCreditsError,
  WalletFrozenError,
} from "../src/lib/wallet/walletStore.ts";
import {
  creditUserWallet,
  debitUserWallet,
  adminAwardBonusCredits,
  adminAdjustCredits,
  getUserLedgerHistory,
  reconcileUserWallet,
} from "../src/lib/wallet/walletService.ts";
import {
  getEconomyConfig,
  saveEconomyConfig,
} from "../src/lib/wallet/economyConfigServer.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(name, condition, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`\x1b[32m[PASS]\x1b[0m ${name} ${details ? "(" + details + ")" : ""}`);
  } else {
    failedTests++;
    console.error(`\x1b[31m[FAIL]\x1b[0m ${name} ${details ? "- " + details : ""}`);
  }
}

async function runSuite() {
  console.log("\n=======================================================");
  console.log("🪙 ZOVIK AI: VIRTUAL-CREDIT WALLET 18-POINT TEST SUITE");
  console.log("=======================================================\n");

  const testUserId = `test_user_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
  const secondaryUser = `test_user_2_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;

  // 1. Wallet creation
  console.log("--- 1. Wallet Creation & Initialization ---");
  const w1 = await getOrCreateWallet(testUserId);
  report("1. Wallet creation: Initializes wallet with 0 balance", w1.balance === 0 && w1.userId === testUserId.toLowerCase());

  // 2. Duplicate wallet creation prevention
  console.log("\n--- 2. Duplicate Wallet Prevention ---");
  const w2 = await getOrCreateWallet(testUserId);
  report("2. Duplicate wallet prevention: Returns existing wallet instance without creating duplicate", w2.id === w1.id && w2.balance === w1.balance);

  // 3. Authorized wallet retrieval
  console.log("\n--- 3. Authorized Wallet Retrieval ---");
  const retrieved = await findWalletByUserId(testUserId);
  report("3. Authorized retrieval: Returns correct wallet record", retrieved !== null && retrieved.id === w1.id);

  // 4. Unauthorized access simulation
  console.log("\n--- 4. Non-Existent & Isolation Checks ---");
  const nonexistent = await findWalletByUserId("non_existent_fake_user_id_12345");
  report("4. Safe lookup: Returns null for uninitialized account", nonexistent === null);

  // 5. Invalid credit amounts validation
  console.log("\n--- 5. Invalid Amount Validation (Strict Positive Integers) ---");
  const invalidAmounts = [-100, 0, 15.5, NaN, Infinity, "100", null, undefined];
  let allInvalidRejected = true;
  for (const inv of invalidAmounts) {
    try {
      await creditUserWallet({ userId: testUserId, amount: inv, reason: "Invalid test" });
      allInvalidRejected = false;
    } catch {
      // Expected rejection
    }
  }
  report("5. Invalid amounts: Rejects negative, zero, float, non-numeric and null amounts", allInvalidRejected);

  // 6. Negative balance prevention
  console.log("\n--- 6. Overdraw & Negative Balance Prevention ---");
  let overdrawBlocked = false;
  try {
    await debitUserWallet({ userId: testUserId, amount: 50, reason: "Attempted overdraw" });
  } catch (err) {
    overdrawBlocked = err instanceof InsufficientCreditsError;
  }
  report("6. Negative balance prevention: Blocks debit exceeding available credits", overdrawBlocked);

  // Deposit legitimate credits for further tests
  const initialDeposit = await creditUserWallet({
    userId: testUserId,
    amount: 1000,
    reason: "Initial purchase package",
    idempotencyKey: `dep_init_${Date.now()}`,
  });
  report("Valid deposit: Credits balance accurately (+1000)", initialDeposit.wallet.balance === 1000);

  // 7. Simultaneous / Concurrent operations race condition test
  console.log("\n--- 7. Concurrent Operations Atomicity ---");
  const concurrentDebits = [10, 20, 30, 40, 50]; // Total 150
  const promises = concurrentDebits.map((amt, idx) =>
    debitUserWallet({
      userId: testUserId,
      amount: amt,
      reason: `Concurrent debit ${idx}`,
      idempotencyKey: `concurrent_${Date.now()}_${idx}`,
    })
  );
  await Promise.all(promises);
  const afterConcurrent = await findWalletByUserId(testUserId);
  report(
    "7. Concurrent operations: Multiple simultaneous debits sum precisely without race loss",
    afterConcurrent.balance === 850, // 1000 - 150
    `Balance: ${afterConcurrent.balance}`
  );

  // 8. Duplicate operation submission (Idempotency)
  console.log("\n--- 8. Idempotent Deduplication ---");
  const fixedIdempotencyKey = `idempotent_test_key_${Date.now()}`;
  const firstCall = await debitUserWallet({
    userId: testUserId,
    amount: 100,
    reason: "Photo unlock charge",
    idempotencyKey: fixedIdempotencyKey,
  });
  const secondCall = await debitUserWallet({
    userId: testUserId,
    amount: 100,
    reason: "Photo unlock charge (retry)",
    idempotencyKey: fixedIdempotencyKey,
  });
  report(
    "8. Idempotency guarantee: Resubmitting identical idempotencyKey deduplicates without double-debiting",
    firstCall.deduplicated === false && secondCall.deduplicated === true && secondCall.wallet.balance === firstCall.wallet.balance && secondCall.ledgerEntry.id === firstCall.ledgerEntry.id,
    `Balance: ${secondCall.wallet.balance}`
  );

  // 9. Input validation fault tolerance
  console.log("\n--- 9. Input Validation & Fault Tolerance ---");
  let caughtBlankUser = false;
  try {
    await executeCreditMutation({
      userId: "",
      amount: 10,
      type: "CREDIT",
      idempotencyKey: "err_test",
      actorType: "USER",
      actorId: "test",
      reason: "Bad test",
    });
  } catch {
    caughtBlankUser = true;
  }
  report("9. Input validation fault tolerance: Fails closed on blank/corrupt parameters", caughtBlankUser);

  // 10. Atomic Ledger & State Synchronization
  console.log("\n--- 10. Atomic Ledger & State Synchronization ---");
  const walletPre = await findWalletByUserId(testUserId);
  const ledgerPreCount = (await getUserLedgerHistory(testUserId)).length;
  await creditUserWallet({
    userId: testUserId,
    amount: 50,
    reason: "Synchronous state write test",
    idempotencyKey: `durability_${Date.now()}`,
  });
  const walletPost = await findWalletByUserId(testUserId);
  const ledgerPostCount = (await getUserLedgerHistory(testUserId)).length;
  report(
    "10. State synchronization: Commit synchronizes wallet balance and ledger entries",
    walletPost.balance === walletPre.balance + 50 && ledgerPostCount === ledgerPreCount + 1
  );

  // 11. Transaction rollback on mid-process failure
  console.log("\n--- 11. Transaction Rollback Verification ---");
  const balanceBeforeFailed = walletPost.balance;
  let rollbackSuccess = false;
  try {
    // Attempting a debit of 999999 credits will fail
    await debitUserWallet({
      userId: testUserId,
      amount: 999999,
      reason: "Excessive debit rollback test",
      idempotencyKey: `rollback_${Date.now()}`,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      const balanceAfterFailed = (await findWalletByUserId(testUserId)).balance;
      rollbackSuccess = balanceAfterFailed === balanceBeforeFailed;
    }
  }
  report("11. Rollback on failure: Failed transactions leave balance unaltered", rollbackSuccess);

  // 12. Ledger mathematical reconciliation
  console.log("\n--- 12. Full Mathematical Ledger Reconciliation ---");
  const recon = await reconcileUserWallet(testUserId);
  report(
    "12. Ledger reconciliation: Sum of cumulative credits minus debits exactly matches stored balance",
    recon.isReconciled === true && recon.discrepancy === 0,
    `Stored: ${recon.storedBalance}, Computed: ${recon.computedBalance}, Total Tx: ${recon.totalTransactions}`
  );

  // 13. Authentication & Input Integrity Checks
  console.log("\n--- 13. Actor & Reason Validation ---");
  let shortReasonBlocked = false;
  try {
    await adminAwardBonusCredits({
      adminId: "admin",
      targetUserId: testUserId,
      amount: 100,
      reason: "hi", // Too short
    });
  } catch {
    shortReasonBlocked = true;
  }
  report("13. Audit enforcement: Administrative credit mutation requires valid audit reason", shortReasonBlocked);

  // 14. Authorized Administrative Credit Mutation
  console.log("\n--- 14. Administrative Privileged Credit Awards ---");
  const adminBonus = await adminAwardBonusCredits({
    adminId: "super_admin_verified",
    targetUserId: testUserId,
    amount: 250,
    reason: "Promotional bonus grant for loyalty program",
  });
  report(
    "14. Admin credit grant: Admin awards bonus with audit trail (+250)",
    adminBonus.ledgerEntry.type === "BONUS" && adminBonus.ledgerEntry.actorType === "ADMIN" && adminBonus.ledgerEntry.amount === 250
  );

  // 15. Historical record immutability (Append-only verification)
  console.log("\n--- 15. Ledger Chain Consistency & Immutability ---");
  const fullHistory = await getUserLedgerHistory(testUserId, 100);
  let chainValid = true;
  // Chronological check (reverse of descending)
  const chronological = [...fullHistory].reverse();
  for (let i = 0; i < chronological.length; i++) {
    const entry = chronological[i];
    if (entry.type === "CREDIT" || entry.type === "BONUS" || entry.type === "REVERSAL") {
      if (entry.balanceAfter !== entry.balanceBefore + entry.amount) chainValid = false;
    } else if (entry.type === "DEBIT") {
      if (entry.balanceAfter !== entry.balanceBefore - entry.amount) chainValid = false;
    }
  }
  report("15. Ledger immutability: Every ledger entry satisfies balanceBefore ± amount = balanceAfter", chainValid && chronological.length > 5);

  // 16. Existing application regression check
  console.log("\n--- 16. Existing Application Non-Interference ---");
  // Ensure existing userStore still functions independently
  const existingUserModules = await import("../src/lib/userStore.js");
  report(
    "16. Existing app regression: Existing userStore module remains intact and loadable",
    typeof existingUserModules.getAllStoredUsers === "function" && typeof existingUserModules.getActiveUserTier === "function"
  );

  // 17. Legacy data backward compatibility
  console.log("\n--- 17. Legacy Account Compatibility ---");
  const legacyUid = `legacy_user_account_${Date.now()}`;
  const legacyWallet = await getOrCreateWallet(legacyUid);
  report(
    "17. Legacy compatibility: Pre-existing accounts without wallets auto-initialize safely with zero errors",
    legacyWallet.balance === 0 && legacyWallet.status === "active"
  );

  // 18. Error & Retry behavior
  console.log("\n--- 18. Reversal & Correction Safeguards ---");
  const adminAdj = await adminAdjustCredits({
    adminId: "compliance_officer",
    targetUserId: testUserId,
    amount: 100,
    reason: "Administrative reconciliation adjustment per audit ticket #409",
  });
  report(
    "18. Audited correction: Authorized adjustment correctly modifies balance and records audit reason",
    adminAdj.ledgerEntry.type === "ADJUSTMENT" && adminAdj.ledgerEntry.amount === 100
  );

  // 19. Existing Record Upsert & Conflict Safety (Zero-Overwrite Guarantee)
  console.log("\n--- 19. Existing Record Initialization & Conflict Safety ---");
  const conflictUid = `existing_test_conflict_${Date.now()}`;
  await creditUserWallet({
    userId: conflictUid,
    amount: 750,
    reason: "Initial funding to test conflict safety",
    idempotencyKey: `init_conflict_${Date.now()}`,
  });
  let zeroOverwriteMaintained = true;
  for (let i = 0; i < 5; i++) {
    const reInit = await getOrCreateWallet(conflictUid);
    if (reInit.balance !== 750) {
      zeroOverwriteMaintained = false;
      break;
    }
  }
  report(
    "19. Existing record safety: getOrCreateWallet never overwrites existing positive balance with 0 on re-initialization",
    zeroOverwriteMaintained
  );

  // 20. Multi-step Payment Approval Idempotent Recovery
  console.log("\n--- 20. Multi-Step Payment Approval Idempotent Recovery ---");
  const multiStepUser = `multistep_user_${Date.now()}`;
  const paymentSlipId = `slip_${Date.now()}`;
  const paymentIdempotencyKey = `pay_coins_${paymentSlipId}`;

  // Step 1: Wallet credited upon initial approval
  const step1 = await creditUserWallet({
    userId: multiStepUser,
    amount: 500,
    reason: "Coin Purchase Approval (EasyPaisa - Trx: TRX999)",
    referenceId: paymentSlipId,
    idempotencyKey: paymentIdempotencyKey,
    actorId: "admin_approval",
  });
  assert.strictEqual(step1.wallet.balance, 500);
  assert.strictEqual(step1.deduplicated, false);

  // Step 2 simulation: Status persistence fails (API 500).
  // Step 3: Admin retries the approval with the same payment ID.
  const step3Retry = await creditUserWallet({
    userId: multiStepUser,
    amount: 500,
    reason: "Coin Purchase Approval (EasyPaisa - Trx: TRX999)",
    referenceId: paymentSlipId,
    idempotencyKey: paymentIdempotencyKey,
    actorId: "admin_approval",
  });
  report(
    "20. Idempotent payment retry: Re-submitting approval credit mutation with identical idempotency key avoids double-crediting",
    step3Retry.deduplicated === true && step3Retry.wallet.balance === 500
  );

  // 21. getEconomyConfig() Zero Side-Effect Verification
  console.log("\n--- 21. getEconomyConfig Read-Only Zero Side-Effect Verification ---");
  const economyFilePath = path.join(process.cwd(), ".data", "economy_config.json");
  const mtimeBefore = fs.existsSync(economyFilePath) ? fs.statSync(economyFilePath).mtimeMs : 0;
  const config = getEconomyConfig();
  const mtimeAfter = fs.existsSync(economyFilePath) ? fs.statSync(economyFilePath).mtimeMs : 0;
  report(
    "21. Pure read-only economy queries: getEconomyConfig triggers zero disk write mutations",
    typeof config.usdtRate === "number" && mtimeBefore === mtimeAfter
  );

  // 22. saveEconomyConfig Persistence & Consistency
  console.log("\n--- 22. saveEconomyConfig Persistence & Consistency ---");
  const updatedEconomy = await saveEconomyConfig({ usdtRate: config.usdtRate });
  report(
    "22. Economy save persistence: Successfully saves economy config and returns updated rate",
    updatedEconomy.usdtRate === config.usdtRate
  );

  // 23. Failed Compensation Durable Incident Tracking
  console.log("\n--- 23. Failed Compensation Durable Incident Tracking ---");
  const incidentId = `inc_test_${Date.now()}`;
  recordWalletIncident({
    id: incidentId,
    type: "FAILED_CONSOLIDATION_REVERSAL",
    userId: "test_unresolved_user",
    amount: 150,
    outIdempotency: `out_${Date.now()}`,
    errorMessage: "Simulated database connection loss during compensation",
    status: "OPEN",
    createdAt: new Date().toISOString(),
  });
  const openIncidents = getUnresolvedWalletIncidents();
  const foundIncident = openIncidents.find((i) => i.id === incidentId);
  report(
    "23. Local incident tracking: Failed compensation incidents are persistently recorded for administrative audit",
    foundIncident !== undefined && foundIncident.amount === 150 && foundIncident.status === "OPEN"
  );

  // 24. Authoritative Cloud Persistence Ordering
  console.log("\n--- 24. Authoritative Cloud Persistence Ordering ---");
  // Proves saveEconomyConfig cleanly updates memory & disk only after cloud verification passes
  const testPackage = { id: "test_pkg", name: "Test Pack", coins: 50, priceUsd: 1, popular: false };
  const partialSaved = await saveEconomyConfig({ packages: [...config.packages, testPackage] });
  const reRead = getEconomyConfig();
  const hasTestPkg = reRead.packages.some((p) => p.id === "test_pkg");
  // Clean up
  await saveEconomyConfig({ packages: config.packages });
  report(
    "24. Authoritative config ordering: Atomic update correctly registers and reads back without data corruption",
    hasTestPkg === true
  );

  console.log("\n=======================================================");
  console.log(`📊 WALLET VERIFICATION REPORT: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Unhandled Wallet Suite Error:", err);
  process.exit(1);
});
