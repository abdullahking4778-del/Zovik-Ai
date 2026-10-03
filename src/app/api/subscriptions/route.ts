import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc } from "firebase/firestore";
import { upsertStoredUser } from "@/lib/userStore";
import { uploadToCloudStorage } from "@/lib/cloudStorage";
import {
  getPersistentPayments,
  savePersistentPayment,
  updatePersistentPaymentStatus,
  deletePersistentPayment,
  generateUniqueId,
} from "@/lib/serverDb";
import { PaymentRequest } from "@/types";

interface PaymentSubmissionPayload {
  userEmail: string;
  plan: "vip" | "plus";
  currency?: string;
  amount?: number;
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

    const { userEmail, plan, currency, amount, method, trxId, senderName, screenshot } = body;

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

    const newRequest: PaymentRequest = {
      id: paymentId,
      userEmail: String(userEmail).trim().toLowerCase(),
      plan: plan === "vip" ? "vip" : "plus",
      planName: plan === "vip" ? "VIP Plan (1 Month)" : "Plus Plan (1 Month)",
      currency: currency || "PKR",
      amount: Number(amount) || (plan === "vip" ? 2500 : 1200),
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

    const updatedPayment = await updatePersistentPaymentStatus(targetId, action);
    if (!updatedPayment) {
      return NextResponse.json({ success: false, error: "Payment request not found" }, { status: 404 });
    }

    if (action === "approve") {
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // 1. Authoritative local store update
      try {
        upsertStoredUser(updatedPayment.userEmail, {
          email: updatedPayment.userEmail,
          tier: updatedPayment.plan === "vip" ? "vip" : "plus",
          isVip: updatedPayment.plan === "vip",
          subscriptionDays: 30,
          subscriptionStart: new Date().toISOString(),
          subscriptionEndsAt: newExpiresAt.toISOString(),
          storageRetentionDays: updatedPayment.plan === "vip" ? 35 : 30,
        });
      } catch (err) {
        console.warn("[Subscriptions] Authoritative user store update failed:", err);
      }

      // 2. Also try to update user in Firestore
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const userDoc = snapshot.docs.find(
          (d) => d.data().email?.toLowerCase() === updatedPayment.userEmail.toLowerCase()
        );

        if (userDoc) {
          await updateDoc(userDoc.ref, {
            zovik_tier: updatedPayment.plan,
            subscriptionStart: new Date().toISOString(),
            subscriptionEndsAt: newExpiresAt.toISOString(),
            storageRetentionDays: updatedPayment.plan === "vip" ? 35 : 30,
          });
        }
      } catch (err) {
        console.warn("[Subscriptions] Firestore update note:", err);
      }
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

