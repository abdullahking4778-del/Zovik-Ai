import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/authSession";
import { getUserWallet, getUserLedgerHistory, deductVoiceCallCredits } from "@/lib/wallet/walletService";
import { getEconomyConfig } from "@/lib/wallet/economyConfigServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/wallet
 * Read-only endpoint for authenticated users to inspect their wallet balance & history.
 * Strictly prevents IDOR by binding strictly to the server-verified session user.
 * Strictly read-only: does not perform any database state mutations on GET.
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await resolveServerUser(req);
    if (!sessionUser.authenticated || !sessionUser.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Valid session required to view wallet." },
        { status: 401 }
      );
    }

    // Read-only retrieval (zero write mutations on GET)
    const wallet = await getUserWallet(sessionUser.userId);
    const history = await getUserLedgerHistory(sessionUser.userId, 25);
    const economy = getEconomyConfig();

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
        status: wallet.status,
        updatedAt: wallet.updatedAt,
      },
      history,
      economy: {
        usdtRate: economy.usdtRate,
        minPurchaseCoins: economy.minPurchaseCoins,
        costPerMessage: economy.costPerMessage,
        costPerPhoto: economy.costPerPhoto,
        costPerVoice: economy.costPerVoice,
        packages: economy.packages,
      },
    });
  } catch (err: unknown) {
    console.error("[Wallet GET Error]:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error retrieving wallet" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wallet
 * Authoritative feature billing endpoint (e.g. live voice calling 2 coins/min).
 * Strictly requires verified authentication.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await resolveServerUser(req);
    if (!sessionUser.authenticated || !sessionUser.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Valid session required." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "voice_call_minute";
    const callId = body.callId;
    const minuteIndex = Number(body.minuteIndex) || 1;

    if (action === "voice_call_minute") {
      const wallet = await getUserWallet(sessionUser.userId);
      if (wallet.balance < 2) {
        return NextResponse.json(
          {
            success: false,
            error: "Coins limit reached! Voice call requires at least 2 coins.",
            coins: wallet.balance,
            requiredCoins: 2,
          },
          { status: 402 }
        );
      }

      const debitResult = await deductVoiceCallCredits(sessionUser.userId, minuteIndex, callId);
      return NextResponse.json({
        success: true,
        deducted: 2,
        balance: debitResult.wallet.balance,
        callId,
        minuteIndex,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unknown wallet action." },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[Wallet POST Error]:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error processing wallet action." },
      { status: 500 }
    );
  }
}
