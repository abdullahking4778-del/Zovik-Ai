import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/authSession";
import {
  getUserWallet,
  getExistingUserWallet,
  getUserLedgerHistory,
  deductVoiceCallCredits,
} from "@/lib/wallet/walletService";
import { getEconomyConfig } from "@/lib/wallet/economyConfigServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/wallet
 * Read-only endpoint for inspecting wallet balance & history.
 * If unauthenticated: provides guest access to live economy configuration (packages & rates).
 * If authenticated: retrieves user wallet with automatic email-to-UID balance consolidation.
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await resolveServerUser(req);
    const economy = getEconomyConfig();

    if (!sessionUser.authenticated || !sessionUser.userId) {
      // Allow guest/unauthenticated access to live economy config so CoinStoreModal can display live packages & rates
      return NextResponse.json({
        success: true,
        guest: true,
        wallet: {
          id: "guest",
          balance: 0,
          currency: "CREDIT",
          status: "guest",
          updatedAt: new Date().toISOString(),
        },
        history: [],
        economy: {
          usdtRate: economy.usdtRate,
          minPurchaseCoins: economy.minPurchaseCoins,
          costPerMessage: economy.costPerMessage,
          costPerPhoto: economy.costPerPhoto,
          costPerVoice: economy.costPerVoice,
          packages: economy.packages,
        },
      });
    }

    // 100% Genuinely read-only lookup of existing wallet (zero write mutations or side-effects on GET)
    const existingWallet = await getExistingUserWallet(sessionUser.userId);
    const wallet = existingWallet || {
      id: `wal_${sessionUser.userId}`,
      balance: 0,
      currency: "CREDIT" as const,
      status: "active" as const,
      updatedAt: new Date().toISOString(),
    };
    const history = existingWallet ? await getUserLedgerHistory(existingWallet.userId, 25) : [];

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
      const wallet = await getUserWallet(sessionUser.userId, sessionUser.userEmail);
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
