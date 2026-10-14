import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PaymentAccountConfig } from "@/types";
import defaultAccounts from "@/data/payment_accounts.json";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";
import { adminDb } from "./firebaseAdmin";

export type PaymentAccountsMap = Record<string, PaymentAccountConfig>;

function getStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_payment_accounts.json");
  }
  return path.join(process.cwd(), ".data", "payment_accounts.json");
}

function safeReadJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw || !raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJsonFile(filePath: string, data: unknown): void {
  const tmpPath = `${filePath}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch {}
  }
}

export function getPersistentPaymentAccounts(): PaymentAccountsMap {
  const filePath = getStoragePath();
  return safeReadJsonFile<PaymentAccountsMap>(filePath, defaultAccounts as PaymentAccountsMap);
}

export function savePersistentPaymentAccounts(update: Partial<PaymentAccountsMap>): PaymentAccountsMap {
  const current = getPersistentPaymentAccounts();
  const merged: PaymentAccountsMap = { ...current };
  for (const [k, v] of Object.entries(update)) {
    if (v) {
      merged[k] = {
        ...(merged[k] || { id: k, name: k, label: k, number: "", title: "", instructions: "", isActive: true }),
        ...v,
      };
    }
  }

  const filePath = getStoragePath();
  safeWriteJsonFile(filePath, merged);

  const fallbackPath = path.join(process.cwd(), ".data", "payment_accounts.json");
  if (filePath !== fallbackPath) {
    safeWriteJsonFile(fallbackPath, merged);
  }

  // 1. Authoritative Cloud Persistence: Supabase PostgreSQL app_settings
  if (isSupabaseConfigured()) {
    Promise.resolve(
      supabaseAdmin.from("app_settings").upsert(
        {
          key: "payment_accounts",
          value: JSON.stringify(merged),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )
    ).catch((err) => console.warn("[PaymentAccounts] Supabase cloud sync notice:", err));
  }

  // 2. Mirror to Firestore config
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      adminDb.collection("config").doc("payment_accounts").set(merged, { merge: true }).catch(() => {});
    }
  } catch {}

  return merged;
}
