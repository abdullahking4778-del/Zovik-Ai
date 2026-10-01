import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc } from "firebase/firestore";

const PAYMENTS_FILE = path.join(process.cwd(), "src", "data", "payment_requests.json");

function getPayments() {
  try {
    if (!fs.existsSync(PAYMENTS_FILE)) return [];
    const data = fs.readFileSync(PAYMENTS_FILE, "utf-8");
    const payments = JSON.parse(data || "[]");
    if (!Array.isArray(payments)) return [];

    // Auto-cleanup policy: Purge heavy base64 screenshot data for payments older than 24h or already processed
    const now = Date.now();
    let hasChanges = false;
    for (const p of payments) {
      if (p.screenshot) {
        const age = now - new Date(p.createdAt || 0).getTime();
        const isOld = age > 24 * 60 * 60 * 1000;
        const isProcessed = p.status === "approved" || p.status === "rejected";
        if (isOld || isProcessed) {
          p.screenshot = null;
          p.screenshotPurged = true;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      savePayments(payments);
    }
    return payments;
  } catch {
    return [];
  }
}

function savePayments(payments: any[]) {
  const tmpPath = `${PAYMENTS_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    const dir = path.dirname(PAYMENTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(payments, null, 2), "utf-8");
    fs.renameSync(tmpPath, PAYMENTS_FILE);
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

    // Guard against oversized payload (Max 5MB for screenshot base64)
    if (typeof screenshot === "string" && screenshot.length > 7 * 1024 * 1024) {
      return NextResponse.json({ error: "Screenshot file size exceeds 5MB limit" }, { status: 413 });
    }

    const payments = getPayments();
    const newRequest = {
      id: "pay-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      userEmail: String(userEmail).trim().toLowerCase(),
      plan: plan === "vip" ? "vip" : "plus",
      planName: plan === "vip" ? "VIP Plan (1 Month)" : "Plus Plan (1 Month)",
      currency: currency || "PKR",
      amount: Number(amount) || (plan === "vip" ? 2500 : 1200),
      method: String(method).trim(),
      trxId: String(trxId).trim(),
      senderName: senderName ? String(senderName).trim() : "Customer",
      screenshot: typeof screenshot === "string" ? screenshot : null,
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
      payment.screenshot = null;
      payment.screenshotPurged = true;

      // Upgrade user in Firestore
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const userDoc = snapshot.docs.find(d => d.data().email?.toLowerCase() === payment.userEmail.toLowerCase());
        
        if (userDoc) {
          const user = userDoc.data();
          const baseDate = user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > new Date()
            ? new Date(user.subscriptionEndsAt)
            : new Date();

          const newExpiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

          await updateDoc(userDoc.ref, {
            zovik_tier: payment.plan,
            subscriptionStart: new Date().toISOString(),
            subscriptionEndsAt: newExpiresAt.toISOString(),
            storageRetentionDays: payment.plan === "vip" ? 35 : 30
          });
        }
      } catch (err) {
        console.warn("Failed to upgrade user in Firestore:", err);
      }
    } else if (action === "reject") {
      payment.status = "rejected";
      payment.rejectedAt = new Date().toISOString();
      payment.screenshot = null;
      payment.screenshotPurged = true;
    }

    savePayments(payments);
    return NextResponse.json({ success: true, payment });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Operation failed" }, { status: 500 });
  }
}
