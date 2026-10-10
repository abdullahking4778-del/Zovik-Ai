import { NextResponse } from "next/server";
import { getPersistentPaymentAccounts } from "@/lib/paymentAccountsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const accounts = getPersistentPaymentAccounts();
    return NextResponse.json(
      { success: true, accounts },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[Payment Accounts GET Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to load payment accounts" }, { status: 500 });
  }
}
