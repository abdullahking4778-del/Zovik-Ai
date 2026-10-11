/**
 * Zovik AI — Virtual-Credit Wallet & Transaction Accounting Types
 * Scope: Strictly isolated financial & accounting primitives.
 */

export type WalletStatus = "active" | "frozen" | "closed";

export type TransactionType =
  | "CREDIT"      // User deposited or purchased credits
  | "DEBIT"       // Credits spent on app services (chat, voice, photo)
  | "BONUS"       // Promotional / bonus credits awarded
  | "ADJUSTMENT"  // Administrative audit correction
  | "REVERSAL";   // Void / rollback of a previous transaction

export type TransactionStatus = "COMPLETED" | "REVERSED" | "FAILED";

export type ActorType = "USER" | "ADMIN" | "SYSTEM";

export interface VirtualWallet {
  id: string;                      // Format: wal_<user_id>
  userId: string;                  // Verified account UID / email
  balance: number;                 // Integer non-negative credit balance
  currency: string;                // Default: 'CREDIT'
  status: WalletStatus;
  version: number;                 // Optimistic lock concurrency version
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;                      // Format: tx_<timestamp>_<uuid>
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number;                  // Integer strictly > 0
  balanceBefore: number;           // Balance snapshot prior to mutation
  balanceAfter: number;            // Balance snapshot after mutation
  idempotencyKey: string;          // Caller-provided unique idempotency key
  actorType: ActorType;
  actorId: string;
  reason: string;                  // Mandatory human/audit explanation
  referenceId?: string;            // Optional correlated entity (e.g. msg_id, photo_id)
  status: TransactionStatus;
  createdAt: string;
}

export interface CreditMutationParams {
  userId: string;
  amount: number;
  type: TransactionType;
  idempotencyKey: string;
  actorType: ActorType;
  actorId: string;
  reason: string;
  referenceId?: string;
}

export interface ReconciliationResult {
  walletId: string;
  userId: string;
  storedBalance: number;
  computedBalance: number;
  totalCredits: number;
  totalDebits: number;
  isReconciled: boolean;
  discrepancy: number;
  totalTransactions: number;
}
