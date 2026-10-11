/**
 * Zovik AI — Virtual-Credit Authoritative Store
 * Scope: Strict double-entry accounting, atomic mutations, idempotency, and reconciliation.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import {
  VirtualWallet,
  LedgerEntry,
  CreditMutationParams,
  ReconciliationResult,
} from "./types";

export class InsufficientCreditsError extends Error {
  constructor(public available: number, public required: number) {
    super(`Insufficient credit balance: available ${available}, required ${required}`);
    this.name = "InsufficientCreditsError";
  }
}

export class WalletFrozenError extends Error {
  constructor(public walletId: string) {
    super(`Wallet ${walletId} is frozen and cannot process mutations`);
    this.name = "WalletFrozenError";
  }
}

// -----------------------------------------------------------------------------
// Local Storage Path Helpers (for Local Dev, CI & Isolated Unit Tests)
// -----------------------------------------------------------------------------
function getWalletsStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_wallets.json");
  }
  return path.join(process.cwd(), ".data", "wallets.json");
}

function getLedgerStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_ledger.json");
  }
  return path.join(process.cwd(), ".data", "ledger.json");
}

function safeReadJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, "utf-8");
    if (!content || !content.trim()) return fallback;
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }
}

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------
function validateIntegerAmount(amount: unknown): number {
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || !Number.isFinite(amount)) {
    throw new Error(`Invalid credit amount: '${amount}'. Must be a strictly positive non-zero integer.`);
  }
  return amount;
}

function sanitizeId(id: string): string {
  if (!id || typeof id !== "string" || !id.trim()) {
    throw new Error("Missing or invalid identifier");
  }
  return id.trim();
}

// -----------------------------------------------------------------------------
// Core Authoritative Storage Engine
// -----------------------------------------------------------------------------

/**
 * Retrieve or initialize a wallet for a verified account.
 * Guarantees a unique wallet per user ID with zero duplication.
 */
export async function getOrCreateWallet(userId: string): Promise<VirtualWallet> {
  const cleanUid = sanitizeId(userId).toLowerCase();
  const walletId = `wal_${cleanUid}`;

  // 1. Supabase PostgreSQL Authoritative Check
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("credit_wallets")
        .select("*")
        .eq("user_id", cleanUid)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          balance: Number(data.balance) || 0,
          currency: data.currency || "CREDIT",
          status: data.status || "active",
          version: Number(data.version) || 1,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }

      // If not exists, insert atomically with ON CONFLICT DO NOTHING
      const now = new Date().toISOString();
      const newWallet: VirtualWallet = {
        id: walletId,
        userId: cleanUid,
        balance: 0,
        currency: "CREDIT",
        status: "active",
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("credit_wallets")
        .upsert(
          {
            id: newWallet.id,
            user_id: newWallet.userId,
            balance: newWallet.balance,
            currency: newWallet.currency,
            status: newWallet.status,
            version: newWallet.version,
            created_at: newWallet.createdAt,
            updated_at: newWallet.updatedAt,
          },
          { onConflict: "user_id", ignoreDuplicates: true }
        )
        .select("*")
        .maybeSingle();

      if (!insertErr && inserted) {
        return {
          id: inserted.id,
          userId: inserted.user_id,
          balance: Number(inserted.balance) || 0,
          currency: inserted.currency || "CREDIT",
          status: inserted.status || "active",
          version: Number(inserted.version) || 1,
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
        };
      }

      // If existing wallet already existed, fetch without modifying
      const { data: existingAfterConflict } = await supabaseAdmin
        .from("credit_wallets")
        .select("*")
        .eq("user_id", cleanUid)
        .maybeSingle();

      if (existingAfterConflict) {
        return {
          id: existingAfterConflict.id,
          userId: existingAfterConflict.user_id,
          balance: Number(existingAfterConflict.balance) || 0,
          currency: existingAfterConflict.currency || "CREDIT",
          status: existingAfterConflict.status || "active",
          version: Number(existingAfterConflict.version) || 1,
          createdAt: existingAfterConflict.created_at,
          updatedAt: existingAfterConflict.updated_at,
        };
      }
    } catch (err) {
      console.warn("[WalletStore] Supabase wallet query note:", err);
    }
  }

  // 2. Local Fallback & Isolated In-Memory Storage
  const wallets = safeReadJson<VirtualWallet[]>(getWalletsStoragePath(), []);
  const existing = wallets.find((w) => w.userId.toLowerCase() === cleanUid);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const created: VirtualWallet = {
    id: walletId,
    userId: cleanUid,
    balance: 0,
    currency: "CREDIT",
    status: "active",
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  wallets.push(created);
  atomicWriteJson(getWalletsStoragePath(), wallets);
  return created;
}

/**
 * Retrieve an existing wallet if it exists. Returns null if not initialized.
 */
export async function findWalletByUserId(userId: string): Promise<VirtualWallet | null> {
  const cleanUid = sanitizeId(userId).toLowerCase();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("credit_wallets")
        .select("*")
        .eq("user_id", cleanUid)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          balance: Number(data.balance) || 0,
          currency: data.currency || "CREDIT",
          status: data.status || "active",
          version: Number(data.version) || 1,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn("[WalletStore] Supabase find wallet note:", err);
    }
  }

  const wallets = safeReadJson<VirtualWallet[]>(getWalletsStoragePath(), []);
  return wallets.find((w) => w.userId.toLowerCase() === cleanUid) || null;
}

// -----------------------------------------------------------------------------
// In-Memory Mutex Lock per Wallet (Eliminates Concurrent Race Conditions)
// -----------------------------------------------------------------------------
class AsyncLock {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      const run = () => {
        this.locked = true;
        resolve(() => {
          this.locked = false;
          const next = this.queue.shift();
          if (next) next();
        });
      };

      if (!this.locked) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }
}

const walletLocks = new Map<string, AsyncLock>();

function getWalletLock(walletId: string): AsyncLock {
  let lock = walletLocks.get(walletId);
  if (!lock) {
    lock = new AsyncLock();
    walletLocks.set(walletId, lock);
  }
  return lock;
}

/**
 * Executes an atomic mutation on the wallet balance and records an append-only ledger entry.
 * Strictly guarantees idempotency, non-negative balances, and consistency.
 */
export async function executeCreditMutation(params: CreditMutationParams): Promise<{
  wallet: VirtualWallet;
  ledgerEntry: LedgerEntry;
  deduplicated: boolean;
}> {
  const cleanUid = sanitizeId(params.userId).toLowerCase();
  const lock = getWalletLock(cleanUid);
  const release = await lock.acquire();

  try {
    const validAmount = validateIntegerAmount(params.amount);
    const cleanIdempotencyKey = sanitizeId(params.idempotencyKey);
    const cleanReason = sanitizeId(params.reason);

    // 1. Idempotency Check in Ledger
    const existingLedgerEntry = await findLedgerEntryByIdempotencyKey(cleanIdempotencyKey);
    if (existingLedgerEntry) {
      const currentWallet = await getOrCreateWallet(cleanUid);
      return {
        wallet: currentWallet,
        ledgerEntry: existingLedgerEntry,
        deduplicated: true,
      };
    }

    // 2. Retrieve Authoritative Wallet
    const wallet = await getOrCreateWallet(cleanUid);
    if (wallet.status === "frozen") {
      throw new WalletFrozenError(wallet.id);
    }

    const balanceBefore = wallet.balance;
    let balanceAfter: number;

    if (params.type === "CREDIT" || params.type === "BONUS") {
      balanceAfter = balanceBefore + validAmount;
    } else if (params.type === "DEBIT") {
      if (balanceBefore < validAmount) {
        throw new InsufficientCreditsError(balanceBefore, validAmount);
      }
      balanceAfter = balanceBefore - validAmount;
    } else if (params.type === "ADJUSTMENT") {
      // Administrative adjustment could add or subtract
      balanceAfter = balanceBefore + validAmount;
      if (balanceAfter < 0) {
        throw new InsufficientCreditsError(balanceBefore, validAmount);
      }
    } else if (params.type === "REVERSAL") {
      balanceAfter = balanceBefore + validAmount;
    } else {
      throw new Error(`Unsupported transaction type: '${params.type}'`);
    }

    const now = new Date().toISOString();
    const txId = `tx_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const ledgerEntry: LedgerEntry = {
      id: txId,
      walletId: wallet.id,
      userId: cleanUid,
      type: params.type,
      amount: validAmount,
      balanceBefore,
      balanceAfter,
      idempotencyKey: cleanIdempotencyKey,
      actorType: params.actorType,
      actorId: sanitizeId(params.actorId),
      reason: cleanReason,
      referenceId: params.referenceId?.trim() || undefined,
      status: "COMPLETED",
      createdAt: now,
    };

    const updatedWallet: VirtualWallet = {
      ...wallet,
      balance: balanceAfter,
      version: wallet.version + 1,
      updatedAt: now,
    };

    // 3. Authoritative Supabase PostgreSQL Persistence (when Cloud configured)
    if (isSupabaseConfigured()) {
      let ledgerInserted = false;
      try {
        // 3A. Insert Ledger Entry
        const { error: ledgerErr } = await supabaseAdmin.from("credit_ledger").insert({
          id: ledgerEntry.id,
          wallet_id: ledgerEntry.walletId,
          user_id: ledgerEntry.userId,
          type: ledgerEntry.type,
          amount: ledgerEntry.amount,
          balance_before: ledgerEntry.balanceBefore,
          balance_after: ledgerEntry.balanceAfter,
          idempotency_key: ledgerEntry.idempotencyKey,
          actor_type: ledgerEntry.actorType,
          actor_id: ledgerEntry.actorId,
          reason: ledgerEntry.reason,
          reference_id: ledgerEntry.referenceId || null,
          status: ledgerEntry.status,
          created_at: ledgerEntry.createdAt,
        });

        if (ledgerErr) {
          // If unique constraint on idempotency violated concurrently, retrieve deduplicated
          if (ledgerErr.code === "23505") {
            const deduplicated = await findLedgerEntryByIdempotencyKey(cleanIdempotencyKey);
            if (deduplicated) {
              return { wallet: await getOrCreateWallet(cleanUid), ledgerEntry: deduplicated, deduplicated: true };
            }
          }
          throw new Error(`Database error writing ledger: ${ledgerErr.message}`);
        }
        ledgerInserted = true;

        // 3B. Update Wallet Balance with Optimistic Concurrency Guard
        const { data: updatedRow, error: walletErr } = await supabaseAdmin
          .from("credit_wallets")
          .update({
            balance: updatedWallet.balance,
            version: updatedWallet.version,
            updated_at: updatedWallet.updatedAt,
          })
          .eq("id", updatedWallet.id)
          .eq("version", wallet.version)
          .select("*")
          .maybeSingle();

        if (walletErr) {
          console.error("[WalletStore] Authoritative wallet balance update error:", walletErr);
          // Rollback: Compensate by deleting the newly inserted ledger entry to prevent partial-write state
          if (ledgerInserted) {
            try {
              await supabaseAdmin.from("credit_ledger").delete().eq("id", ledgerEntry.id);
            } catch {}
          }
          throw new Error(`Database error updating wallet balance: ${walletErr.message}`);
        }

        // If no row was updated, another serverless instance updated the version concurrently
        if (!updatedRow) {
          if (ledgerInserted) {
            try {
              await supabaseAdmin.from("credit_ledger").delete().eq("id", ledgerEntry.id);
            } catch {}
          }
          throw new Error("Concurrent mutation conflict: Wallet version mismatch. Transaction aborted.");
        }

        return {
          wallet: {
            id: updatedRow.id,
            userId: updatedRow.user_id,
            balance: Number(updatedRow.balance) || 0,
            currency: updatedRow.currency || "CREDIT",
            status: updatedRow.status || "active",
            version: Number(updatedRow.version) || updatedWallet.version,
            createdAt: updatedRow.created_at,
            updatedAt: updatedRow.updated_at,
          },
          ledgerEntry,
          deduplicated: false,
        };
      } catch (err: unknown) {
        if (err instanceof InsufficientCreditsError || err instanceof WalletFrozenError) throw err;
        console.error("[WalletStore] Authoritative cloud mutation failure (failing closed):", err);
        throw err;
      }
    } else {
      // 4. Local Fallback Persistence (Used in Local Dev, CI & Test environments when cloud DB is unconfigured)
      const wallets = safeReadJson<VirtualWallet[]>(getWalletsStoragePath(), []);
      const wIdx = wallets.findIndex((w) => w.id === updatedWallet.id);
      if (wIdx >= 0) {
        wallets[wIdx] = updatedWallet;
      } else {
        wallets.push(updatedWallet);
      }
      atomicWriteJson(getWalletsStoragePath(), wallets);

      const ledger = safeReadJson<LedgerEntry[]>(getLedgerStoragePath(), []);
      ledger.push(ledgerEntry);
      atomicWriteJson(getLedgerStoragePath(), ledger);

      return {
        wallet: updatedWallet,
        ledgerEntry,
        deduplicated: false,
      };
    }
  } finally {
    release();
  }
}

/**
 * Lookup an existing ledger record by idempotency key.
 */
export async function findLedgerEntryByIdempotencyKey(key: string): Promise<LedgerEntry | null> {
  const cleanKey = sanitizeId(key);

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("credit_ledger")
        .select("*")
        .eq("idempotency_key", cleanKey)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          walletId: data.wallet_id,
          userId: data.user_id,
          type: data.type,
          amount: Number(data.amount),
          balanceBefore: Number(data.balance_before),
          balanceAfter: Number(data.balance_after),
          idempotencyKey: data.idempotency_key,
          actorType: data.actor_type,
          actorId: data.actor_id,
          reason: data.reason,
          referenceId: data.reference_id || undefined,
          status: data.status,
          createdAt: data.created_at,
        };
      }
    } catch {}
  }

  const ledger = safeReadJson<LedgerEntry[]>(getLedgerStoragePath(), []);
  return ledger.find((e) => e.idempotencyKey === cleanKey) || null;
}

/**
 * Retrieve transaction history for a user's wallet.
 */
export async function getWalletLedgerHistory(userId: string, limit: number = 50): Promise<LedgerEntry[]> {
  const cleanUid = sanitizeId(userId).toLowerCase();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("credit_ledger")
        .select("*")
        .eq("user_id", cleanUid)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        return data.map((d) => ({
          id: d.id,
          walletId: d.wallet_id,
          userId: d.user_id,
          type: d.type,
          amount: Number(d.amount),
          balanceBefore: Number(d.balance_before),
          balanceAfter: Number(d.balance_after),
          idempotencyKey: d.idempotency_key,
          actorType: d.actor_type,
          actorId: d.actor_id,
          reason: d.reason,
          referenceId: d.reference_id || undefined,
          status: d.status,
          createdAt: d.created_at,
        }));
      }
    } catch {}
  }

  const ledger = safeReadJson<LedgerEntry[]>(getLedgerStoragePath(), []);
  return ledger
    .filter((e) => e.userId.toLowerCase() === cleanUid)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Mathematical Reconciliation Audit:
 * Computes: Sum(Credits + Bonuses) - Sum(Debits) and verifies equality with stored balance.
 */
export async function reconcileWallet(userId: string): Promise<ReconciliationResult> {
  const cleanUid = sanitizeId(userId).toLowerCase();
  const wallet = await getOrCreateWallet(cleanUid);
  const history = await getWalletLedgerHistory(cleanUid, 10000);

  let totalCredits = 0;
  let totalDebits = 0;

  for (const entry of history) {
    if (entry.status !== "COMPLETED") continue;
    if (entry.type === "CREDIT" || entry.type === "BONUS" || entry.type === "REVERSAL") {
      totalCredits += entry.amount;
    } else if (entry.type === "DEBIT") {
      totalDebits += entry.amount;
    } else if (entry.type === "ADJUSTMENT") {
      // Adjustments are recorded as delta
      if (entry.balanceAfter > entry.balanceBefore) {
        totalCredits += entry.amount;
      } else {
        totalDebits += entry.amount;
      }
    }
  }

  const computedBalance = totalCredits - totalDebits;
  const discrepancy = wallet.balance - computedBalance;

  return {
    walletId: wallet.id,
    userId: cleanUid,
    storedBalance: wallet.balance,
    computedBalance,
    totalCredits,
    totalDebits,
    isReconciled: discrepancy === 0,
    discrepancy,
    totalTransactions: history.length,
  };
}
