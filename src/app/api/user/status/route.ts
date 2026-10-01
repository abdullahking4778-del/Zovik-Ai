import { NextRequest, NextResponse } from "next/server";
import { getActiveUserTier, findStoredUser, upsertStoredUser } from "@/lib/userStore";
import fs from "fs";
import path from "path";

function getPaymentsFilePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_payments.json");
  }
  return path.join(process.cwd(), "src", "data", "payment_requests.json");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const uid = (searchParams.get("uid") || "").trim();

  if (!email && !uid) {
    return NextResponse.json({ error: "Missing email or uid parameter" }, { status: 400 });
  }

  // 1. Check user store by email first, then fallback to uid
  let status = email 
    ? getActiveUserTier(email) 
    : { tier: "free" as const, isVip: false, subscriptionEndsAt: null, storageRetentionDays: 7 };

  if (status.tier === "free" && uid) {
    status = getActiveUserTier(uid);
  }

  // 2. Cross-check payments in case an admin approved a payment proof by email
  if (status.tier === "free" && email) {
    try {
      const paymentsPath = getPaymentsFilePath();
      let raw: string | null = null;
      if (fs.existsSync(paymentsPath)) {
        raw = fs.readFileSync(paymentsPath, "utf-8");
      } else {
        const localFallback = path.join(process.cwd(), "src", "data", "payment_requests.json");
        if (fs.existsSync(localFallback)) {
          raw = fs.readFileSync(localFallback, "utf-8");
        }
      }

      if (raw) {
        const payments = JSON.parse(raw || "[]");
        if (Array.isArray(payments)) {
          const approved = payments.find(
            (p) => p.status === "approved" && p.userEmail?.toLowerCase() === email
          );
          if (approved) {
            const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const updated = upsertStoredUser(uid || email, {
              id: uid || email,
              email: email,
              tier: approved.plan === "vip" ? "vip" : "plus",
              isVip: approved.plan === "vip",
              subscriptionDays: 30,
              subscriptionEndsAt: endsAt,
              storageRetentionDays: approved.plan === "vip" ? 35 : 30,
            });
            status = {
              tier: updated.tier,
              isVip: updated.isVip,
              subscriptionEndsAt: updated.subscriptionEndsAt || null,
              storageRetentionDays: updated.storageRetentionDays,
            };
          }
        }
      }
    } catch (e) {
      console.warn("[UserStatusAPI] Error checking payment requests:", e);
    }
  }

  // 3. Link uid and email if tier is active and both are known
  if (status.tier !== "free" && uid && email) {
    try {
      upsertStoredUser(uid, {
        id: uid,
        email: email,
        tier: status.tier,
        isVip: status.isVip,
        subscriptionEndsAt: status.subscriptionEndsAt,
        storageRetentionDays: status.storageRetentionDays,
      });
    } catch {}
  }

  return NextResponse.json({
    success: true,
    tier: status.tier,
    isVip: status.isVip,
    subscriptionEndsAt: status.subscriptionEndsAt,
    storageRetentionDays: status.storageRetentionDays,
  });
}
