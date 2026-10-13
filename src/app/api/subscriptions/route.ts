import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc } from "firebase/firestore";
import { upsertStoredUser, findStoredUser } from "@/lib/userStore";
import { uploadToCloudStorage } from "@/lib/cloudStorage";
import {
  getPersistentPayments,
  savePersistentPayment,
  updatePersistentPaymentStatus,
  deletePersistentPayment,
  generateUniqueId,
} from "@/lib/serverDb";
import { getPersistentPlans } from "@/lib/plansStore";
import { PaymentRequest } from "@/types";
import { creditUserWallet } from "@/lib/wallet/walletService";

interface PaymentSubmissionPayload {
  userId?: string;
  userEmail: string;
  plan: string;
  planName?: string;
  currency?: string;
  amount?: number | string;
  coins?: number;
  method: string;
  trxId: string;
  senderName?: string;
  screenshot?: string;
}

// GET /api/subscriptions -> Get all payment requests (Admin protected)
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const payments = await getPersistentPayments();
    return NextResponse.json({ success: true, payments });
  } catch (err: unknown) {
    console.error("[Subscriptions GET Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error fetching payments" }, { status: 500 });
  }
}

// POST /api/subscriptions -> User submits payment proof + screenshot
export async function POST(req: NextRequest) {
  try {
    let body: Partial<PaymentSubmissionPayload>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { userId, userEmail, plan, planName, currency, amount, coins, method, trxId, senderName, screenshot } = body;

    if (!userEmail || !plan || !method || !trxId) {
      return NextResponse.json({ success: false, error: "Please fill all required payment fields." }, { status: 400 });
    }

    const paymentId = generateUniqueId("pay");

    // Save screenshot to Cloud Storage / Compressed Data-URL
    let screenshotUrl: string | null = null;
    if (typeof screenshot === "string" && screenshot.length > 50) {
      try {
        screenshotUrl = await uploadToCloudStorage(
          `slips/slip_${Date.now()}_${trxId}.jpg`,
          screenshot,
          "image/jpeg"
        );
      } catch (uploadErr) {
        console.warn("[Subscriptions] Cloud upload note, saving as data URL:", uploadErr);
        screenshotUrl = screenshot;
      }
    }

    // Robust dynamic amount parsing (handles 200, "200", "Rs. 200", "$6", etc.)
    let cleanAmount = 1500;
    if (typeof amount === "number" && !isNaN(amount)) {
      cleanAmount = amount;
    } else if (typeof amount === "string") {
      const parsedNum = parseInt(amount.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        cleanAmount = parsedNum;
      }
    }

    const selectedPlanId = String(plan || "vip").trim();
    let cleanPlanName = planName;
    if (!cleanPlanName) {
      if (selectedPlanId.startsWith("pack_") || selectedPlanId === "coins") {
        cleanPlanName = `${(coins || cleanAmount).toLocaleString()} Coins Pack`;
      } else {
        cleanPlanName =
          selectedPlanId === "vip"
            ? "VIP Plan"
            : selectedPlanId === "plus"
            ? "Plus Plan"
            : selectedPlanId === "vip_plus"
            ? "VIP Plus Diamond"
            : `${selectedPlanId.toUpperCase()} Plan`;
      }
    }

    const calculatedCoins = coins !== undefined && Number(coins) > 0 ? Number(coins) : (selectedPlanId.startsWith("pack_") || selectedPlanId === "coins" ? cleanAmount : undefined);

    const newRequest: PaymentRequest = {
      id: paymentId,
      userId: userId ? String(userId).trim() : undefined,
      userEmail: String(userEmail).trim().toLowerCase(),
      plan: selectedPlanId,
      planName: cleanPlanName,
      currency: currency || "PKR",
      amount: cleanAmount,
      coins: calculatedCoins,
      method: String(method).trim(),
      trxId: String(trxId).trim(),
      senderName: senderName ? String(senderName).trim() : "Customer",
      screenshot: screenshotUrl,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await savePersistentPayment(newRequest);

    return NextResponse.json({
      success: true,
      message: "Payment submitted successfully. Your request is now under review.",
      request: newRequest,
    });
  } catch (err: unknown) {
    console.error("[Subscriptions POST Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error submitting payment" }, { status: 500 });
  }
}

// PATCH /api/subscriptions -> Admin approves or rejects
export async function PATCH(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const body: { id?: string; paymentId?: string; action?: "approve" | "reject" } =
      await req.json().catch(() => ({}));
    const targetId = body.id || body.paymentId;
    const action = body.action;

    if (!targetId || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ success: false, error: "Valid payment ID and action ('approve' | 'reject') required" }, { status: 400 });
    }

    const allPayments = await getPersistentPayments();
    const targetPayment = allPayments.find((p) => p.id === targetId);
    if (!targetPayment) {
      return NextResponse.json({ success: false, error: "Payment request not found" }, { status: 404 });
    }

    let updatedPayment = targetPayment;

    if (action === "approve") {
      // 1. Link user UID & Email if available to ensure instant wallet resolution
      const targetEmail = (targetPayment.userEmail || "").trim().toLowerCase();
      let targetUid = (targetPayment.userId || "").trim();

      const matchedUser = targetEmail ? findStoredUser(targetEmail) : null;
      if (!targetUid && matchedUser?.id && matchedUser.id !== targetEmail) {
        targetUid = matchedUser.id;
      }

      if (targetUid && targetEmail) {
        try {
          upsertStoredUser(targetUid, {
            id: targetUid,
            email: targetEmail,
          });
        } catch {}
      }

      // 2. If payment includes coins, credit user wallet FIRST before mutating payment status
      if (targetPayment.coins && targetPayment.coins > 0) {
        try {
          const recipientId = targetUid || targetEmail;
          await creditUserWallet({
            userId: recipientId,
            amount: targetPayment.coins,
            reason: `Coin Purchase Approval (${targetPayment.method} - Trx: ${targetPayment.trxId})`,
            referenceId: targetPayment.id,
            idempotencyKey: `pay_coins_${targetPayment.id}`,
            actorId: "admin_approval",
          });
        } catch (walletErr) {
          console.error("[Subscriptions] Failed to credit wallet upon approval:", walletErr);
          return NextResponse.json(
            {
              success: false,
              error: `Failed to credit user coins: ${walletErr instanceof Error ? walletErr.message : "Database error"}. Payment status remains pending.`,
            },
            { status: 500 }
          );
        }
      }

      // 3. Mark payment status as approved after wallet credit has succeeded
      const marked = await updatePersistentPaymentStatus(targetId, "approve");
      if (!marked) {
        return NextResponse.json(
          { success: false, error: "Failed to persist approved payment status record." },
          { status: 500 }
        );
      }
      updatedPayment = marked;

      // 4. Plan duration & tier handling (only for VIP / Plus subscription purchases, not pure coin packs)
      const isCoinsOnly = Boolean(
        updatedPayment.plan?.startsWith("pack_") ||
        updatedPayment.plan === "coins" ||
        (updatedPayment.coins && !updatedPayment.plan.toLowerCase().includes("vip") && !updatedPayment.plan.toLowerCase().includes("plus"))
      );

      if (!isCoinsOnly) {
        let planDays = 30;
        try {
          const allPlans = await getPersistentPlans();
          const matched = allPlans.find((p) => p.id === updatedPayment.plan);
          if (matched?.durationDays) {
            planDays = matched.durationDays;
          }
        } catch (err) {
          console.warn("[Subscriptions] Plan lookup note, using 30d default:", err);
        }

        const newExpiresAt = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000);
        const isVipTier =
          updatedPayment.plan.toLowerCase().includes("vip") ||
          updatedPayment.plan === "vip_plus";
        const assignedTier: "free" | "plus" | "vip" = isVipTier ? "vip" : "plus";

        // Authoritative local store update
        try {
          const storeKey = targetUid || targetEmail;
          upsertStoredUser(storeKey, {
            id: targetUid || storeKey,
            email: targetEmail,
            tier: assignedTier,
            isVip: isVipTier,
            subscriptionDays: planDays,
            subscriptionStart: new Date().toISOString(),
            subscriptionEndsAt: newExpiresAt.toISOString(),
            storageRetentionDays: isVipTier ? 35 : 30,
          });
        } catch (err) {
          console.warn("[Subscriptions] Authoritative user store update failed:", err);
        }

        // Also update user in Firestore
        try {
          const usersRef = collection(db, "users");
          const snapshot = await getDocs(usersRef);
          const userDoc = snapshot.docs.find(
            (d) => d.data().email?.toLowerCase() === targetEmail || (targetUid && d.id === targetUid)
          );

          if (userDoc) {
            await updateDoc(userDoc.ref, {
              zovik_tier: updatedPayment.plan,
              subscriptionStart: new Date().toISOString(),
              subscriptionEndsAt: newExpiresAt.toISOString(),
              storageRetentionDays: isVipTier ? 35 : 30,
            });
          }
        } catch (err) {
          console.warn("[Subscriptions] Firestore update note:", err);
        }
      }
    } else if (action === "reject") {
      const rejected = await updatePersistentPaymentStatus(targetId, "reject");
      if (!rejected) {
        return NextResponse.json(
          { success: false, error: "Failed to persist rejected payment status record." },
          { status: 500 }
        );
      }
      updatedPayment = rejected;
    }

    return NextResponse.json({ success: true, payment: updatedPayment });
  } catch (err: unknown) {
    console.error("[Subscriptions PATCH Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error updating payment status" }, { status: 500 });
  }
}

// DELETE /api/subscriptions -> Admin purges payment request & slip permanently
export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    let targetId = searchParams.get("id");
    if (!targetId) {
      const body = await req.json().catch(() => ({}));
      targetId = body.id || body.paymentId;
    }

    if (!targetId) {
      return NextResponse.json({ success: false, error: "Payment ID is required to delete" }, { status: 400 });
    }

    await deletePersistentPayment(targetId);

    return NextResponse.json({
      success: true,
      message: "Payment record and proof slip permanently removed.",
      deletedId: targetId,
    });
  } catch (err: unknown) {
    console.error("[Subscriptions DELETE Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error deleting payment" }, { status: 500 });
  }
}

