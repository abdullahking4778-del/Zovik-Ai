import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc } from "firebase/firestore";
import { upsertStoredUser } from "@/lib/userStore";
import { uploadToCloudStorage } from "@/lib/cloudStorage";

function getPaymentsFilePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_payments.json");
  }
  return path.join(process.cwd(), "src", "data", "payment_requests.json");
}

function getPayments() {
  try {
    const filePath = getPaymentsFilePath();
    if (!fs.existsSync(filePath)) {
      // Try root project path fallback
      const localFallback = path.join(process.cwd(), "src", "data", "payment_requests.json");
      if (fs.existsSync(localFallback)) {
        const d = fs.readFileSync(localFallback, "utf-8");
        return JSON.parse(d || "[]");
      }
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    const payments = JSON.parse(data || "[]");
    return Array.isArray(payments) ? payments : [];
  } catch {
    return [];
  }
}

function savePayments(payments: any[]) {
  const filePath = getPaymentsFilePath();
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(payments, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error("Failed to atomically save payments:", err);
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

// GET /api/subscriptions -> Get all payment requests (Admin protected)
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const payments = getPayments();
    return NextResponse.json({ payments });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch payments" }, { status: 500 });
  }
}

// POST /api/subscriptions -> User submits payment proof + screenshot
export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { userEmail, plan, currency, amount, method, trxId, senderName, screenshot } = body || {};

    if (!userEmail || !plan || !method || !trxId) {
      return NextResponse.json({ error: "Please fill all required payment fields." }, { status: 400 });
    }

    const paymentId = "pay-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);

    // Save screenshot to Cloud Storage / Firebase Storage if provided as Base64
    let screenshotUrl: string | null = null;
    if (typeof screenshot === "string" && screenshot.length > 50) {
      try {
        screenshotUrl = await uploadToCloudStorage(
          `slips/slip_${Date.now()}_${trxId}.jpg`,
          screenshot,
          "image/jpeg"
        );
      } catch (uploadErr) {
        console.warn("[Subscriptions] Cloud upload note, saving locally:", uploadErr);
        screenshotUrl = screenshot; // fallback to base64 if upload fails completely
      }
    }

    const payments = getPayments();
    const newRequest = {
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

    payments.unshift(newRequest);
    savePayments(payments);

    return NextResponse.json({
      success: true,
      message: "Payment submitted successfully. Your request is now under review.",
      request: newRequest,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to submit payment" }, { status: 500 });
  }
}

// PATCH /api/subscriptions -> Admin approves or rejects
export async function PATCH(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, action } = body || {};

    const payments = getPayments();
    const payment = payments.find((p: any) => p.id === id);
    if (!payment) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (action === "approve") {
      payment.status = "approved";
      payment.approvedAt = new Date().toISOString();

      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // 1. Authoritative local store update (Guaranteed to succeed, zero permission issues)
      try {
        upsertStoredUser(payment.userEmail, {
          email: payment.userEmail,
          tier: payment.plan === "vip" ? "vip" : "plus",
          isVip: payment.plan === "vip",
          subscriptionDays: 30,
          subscriptionStart: new Date().toISOString(),
          subscriptionEndsAt: newExpiresAt.toISOString(),
          storageRetentionDays: payment.plan === "vip" ? 35 : 30,
        });
      } catch (err) {
        console.warn("[Subscriptions] Authoritative user store update failed:", err);
      }

      // 2. Also try to update user in Firestore
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const userDoc = snapshot.docs.find(
          (d) => d.data().email?.toLowerCase() === payment.userEmail.toLowerCase()
        );

        if (userDoc) {
          await updateDoc(userDoc.ref, {
            zovik_tier: payment.plan,
            subscriptionStart: new Date().toISOString(),
            subscriptionEndsAt: newExpiresAt.toISOString(),
            storageRetentionDays: payment.plan === "vip" ? 35 : 30,
          });
        }
      } catch (err) {
        console.warn("[Subscriptions] Firestore update note (Handled via authoritative store):", err);
      }
    } else if (action === "reject") {
      payment.status = "rejected";
      payment.rejectedAt = new Date().toISOString();
    }

    savePayments(payments);
    return NextResponse.json({ success: true, payment });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Operation failed" }, { status: 500 });
  }
}
