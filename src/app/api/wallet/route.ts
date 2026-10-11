import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/authSession";
import { getUserWallet, getUserLedgerHistory } from "@/lib/wallet/walletService";
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
