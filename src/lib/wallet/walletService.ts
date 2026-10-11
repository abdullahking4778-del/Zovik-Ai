/**
 * Zovik AI — Virtual-Credit Wallet Service
 * Scope: High-level business operations, input sanitation, authorization guards.
 */

import crypto from "crypto";
import {
  getOrCreateWallet,
  findWalletByUserId,
  executeCreditMutation,
  getWalletLedgerHistory,
  reconcileWallet,
  InsufficientCreditsError,
  WalletFrozenError,
} from "./walletStore";
import {
  VirtualWallet,
  LedgerEntry,
  ReconciliationResult,
} from "./types";

export { InsufficientCreditsError, WalletFrozenError };

/**
 * Retrieves the wallet for a user. Initializes on first access.
 */
export async function getUserWallet(userId: string): Promise<VirtualWallet> {
  return getOrCreateWallet(userId);
}

/**
 * Read-only lookup for existing wallet.
 */
export async function getExistingUserWallet(userId: string): Promise<VirtualWallet | null> {
  return findWalletByUserId(userId);
}

/**
 * Deposits credits into user's wallet.
 */
export async function creditUserWallet(params: {
  userId: string;
  amount: number;
  reason: string;
  referenceId?: string;
  idempotencyKey?: string;
  actorId?: string;
}): Promise<{ wallet: VirtualWallet; ledgerEntry: LedgerEntry; deduplicated: boolean }> {
  const idempotencyKey = params.idempotencyKey || `credit_${Date.now()}_${crypto.randomUUID()}`;

  return executeCreditMutation({
    userId: params.userId,
    amount: params.amount,
    type: "CREDIT",
    idempotencyKey,
    actorType: "USER",
    actorId: params.actorId || params.userId,
    reason: params.reason,
    referenceId: params.referenceId,
  });
}

/**
 * Spends/Debits credits from user's wallet (e.g. for AI Chat, Voice, Photos).
 * Guaranteed to fail closed if balance is insufficient.
 */
export async function debitUserWallet(params: {
  userId: string;
  amount: number;
  reason: string;
  referenceId?: string;
  idempotencyKey?: string;
}): Promise<{ wallet: VirtualWallet; ledgerEntry: LedgerEntry; deduplicated: boolean }> {
  const idempotencyKey = params.idempotencyKey || `debit_${Date.now()}_${crypto.randomUUID()}`;

  return executeCreditMutation({
    userId: params.userId,
    amount: params.amount,
    type: "DEBIT",
    idempotencyKey,
    actorType: "USER",
    actorId: params.userId,
    reason: params.reason,
    referenceId: params.referenceId,
  });
}

/**
 * Admin action: Grants promotional bonus credits to any user (friend, tester, promo).
 * Requires mandatory human reason.
 */
export async function adminAwardBonusCredits(params: {
  adminId: string;
  targetUserId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
}): Promise<{ wallet: VirtualWallet; ledgerEntry: LedgerEntry; deduplicated: boolean }> {
  if (!params.reason || params.reason.trim().length < 4) {
    throw new Error("A meaningful audit reason (min 4 characters) is strictly required for administrative credits.");
  }
  const idempotencyKey = params.idempotencyKey || `admin_bonus_${Date.now()}_${crypto.randomUUID()}`;

  return executeCreditMutation({
    userId: params.targetUserId,
    amount: params.amount,
    type: "BONUS",
    idempotencyKey,
    actorType: "ADMIN",
    actorId: params.adminId,
    reason: params.reason.trim(),
  });
}

/**
 * Admin action: Performs an auditable manual balance adjustment.
 */
export async function adminAdjustCredits(params: {
  adminId: string;
  targetUserId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
}): Promise<{ wallet: VirtualWallet; ledgerEntry: LedgerEntry; deduplicated: boolean }> {
  if (!params.reason || params.reason.trim().length < 6) {
    throw new Error("A comprehensive audit reason (min 6 characters) is strictly required for balance adjustments.");
  }
  const idempotencyKey = params.idempotencyKey || `admin_adj_${Date.now()}_${crypto.randomUUID()}`;

  return executeCreditMutation({
    userId: params.targetUserId,
    amount: params.amount,
    type: "ADJUSTMENT",
    idempotencyKey,
    actorType: "ADMIN",
    actorId: params.adminId,
    reason: params.reason.trim(),
  });
}

/**
 * Retrieves the transaction history for a user.
 */
export async function getUserLedgerHistory(userId: string, limit: number = 50): Promise<LedgerEntry[]> {
  return getWalletLedgerHistory(userId, limit);
}

/**
 * Runs an audit reconciliation check for a user's wallet.
 */
export async function reconcileUserWallet(userId: string): Promise<ReconciliationResult> {
  return reconcileWallet(userId);
}

/**
 * Awards a one-time welcome bonus (e.g. 20 coins) safely using an idempotent key.
 */
export async function ensureUserWelcomeBonus(userId: string, bonusAmount: number = 20): Promise<VirtualWallet> {
  const wallet = await getOrCreateWallet(userId);
  if (bonusAmount <= 0) return wallet;

  try {
    const res = await executeCreditMutation({
      userId,
      amount: bonusAmount,
      type: "BONUS",
      idempotencyKey: `welcome_signup_${userId.toLowerCase()}`,
      actorType: "SYSTEM",
      actorId: "system_welcome_grant",
      reason: "Welcome Signup Bonus 🎁 (20 Free Coins)",
    });
    return res.wallet;
  } catch (err) {
    // If already credited or error, return current wallet safely
    return wallet;
  }
}

/**
 * Deduct credits for a chat message (1 coin).
 */
export async function deductChatCredits(userId: string, messageId?: string) {
  return debitUserWallet({
    userId,
    amount: 1,
    reason: "AI Chat Message 💬",
    referenceId: messageId,
    idempotencyKey: messageId ? `chat_${messageId}` : undefined,
  });
}

/**
 * Deduct credits for AI photo generation (5 coins).
 */
export async function deductPhotoCredits(userId: string, photoId?: string) {
  return debitUserWallet({
    userId,
    amount: 5,
    reason: "Private HD Photo Generation 📸",
    referenceId: photoId,
    idempotencyKey: photoId ? `photo_${photoId}` : undefined,
  });
}

/**
 * Deduct credits for voice TTS (2 coins).
 */
export async function deductVoiceCredits(userId: string, voiceId?: string) {
  return debitUserWallet({
    userId,
    amount: 2,
    reason: "Neural Voice Note 🎙️",
    referenceId: voiceId,
    idempotencyKey: voiceId ? `voice_${voiceId}` : undefined,
  });
}

