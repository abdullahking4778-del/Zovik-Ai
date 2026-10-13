import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getUserWallet,
  getUserLedgerHistory,
  adminAwardBonusCredits,
  adminAdjustCredits,
  reconcileUserWallet,
} from "@/lib/wallet/walletService";
import { getEconomyConfig, saveEconomyConfig } from "@/lib/wallet/economyConfigServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/wallet?userId=<target_id>
 * Admin inspections: View any user's balance, immutable ledger history, and reconciliation integrity.
 */
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = (searchParams.get("userId") || "").trim();

    if (!targetUserId) {
      const economy = getEconomyConfig();
      return NextResponse.json({
        success: true,
        economy,
      });
    }

    const wallet = await getUserWallet(targetUserId);
    const history = await getUserLedgerHistory(targetUserId, 50);
    const reconciliation = await reconcileUserWallet(targetUserId);

    return NextResponse.json({
      success: true,
      wallet,
      history,
      reconciliation,
    });
  } catch (err: unknown) {
    console.error("[Admin Wallet GET Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve user wallet audit data" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/wallet
 * Admin updates economy settings (e.g. USDT exchange rate, feature costs, minimum purchase)
 */
export async function PUT(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const updated = await saveEconomyConfig(body);
    return NextResponse.json({ success: true, economy: updated });
  } catch (err: unknown) {
    console.error("[Admin Wallet PUT Error]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update economy config" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/wallet
 * Privileged administrative mutation: Award promotional bonus credits or perform an audited adjustment.
 * Strictly requires an authorized admin session and mandatory audit reason.
 */
export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetUserId = (body.targetUserId || body.userId || "").trim();
    const amount = Number(body.amount);
    const type = body.type === "ADJUSTMENT" ? "ADJUSTMENT" : "BONUS";
    const reason = (body.reason || "").trim();
    const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey).trim() : undefined;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "Target user ID is required" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be a strictly positive non-zero integer" },
        { status: 400 }
      );
    }

    if (reason.length < 6) {
      return NextResponse.json(
        { success: false, error: "A comprehensive audit reason (at least 6 characters) is strictly required" },
        { status: 400 }
      );
    }

    let result;
    if (type === "BONUS") {
      result = await adminAwardBonusCredits({
        adminId: "admin_verified_session",
        targetUserId,
        amount,
        reason,
        idempotencyKey,
      });
    } else {
      result = await adminAdjustCredits({
        adminId: "admin_verified_session",
        targetUserId,
        amount,
        reason,
        idempotencyKey,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${type} of ${amount} credits for user '${targetUserId}'.`,
      wallet: result.wallet,
      ledgerEntry: result.ledgerEntry,
      deduplicated: result.deduplicated,
    });
  } catch (err: unknown) {
    console.error("[Admin Wallet POST Error]:", err);
    const message = err instanceof Error ? err.message : "Internal server error adjusting wallet";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
