import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getPersistentPaymentAccounts, savePersistentPaymentAccounts, PaymentAccountsMap } from "@/lib/paymentAccountsStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const accounts = getPersistentPaymentAccounts();
  return NextResponse.json({ success: true, accounts });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: Partial<PaymentAccountsMap> = await req.json();
    const updated = savePersistentPaymentAccounts(body);
    return NextResponse.json({ success: true, accounts: updated, message: "Payment accounts updated successfully" });
  } catch (err: unknown) {
    console.error("[Admin Payment Accounts Error]:", err);
    return NextResponse.json({ success: false, error: "Failed to update payment accounts" }, { status: 500 });
  }
}
