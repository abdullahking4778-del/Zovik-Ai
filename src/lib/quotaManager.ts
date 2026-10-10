import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest } from "next/server";

export interface QuotaRecord {
  count: number;
  resetAt: number;
  tier: "free" | "plus" | "vip";
}

export type QuotaType = "chat" | "photo";

const DEFAULT_QUOTA_LIMITS: Record<QuotaType, Record<"free" | "plus" | "vip", number>> = {
  chat: {
    free: 20,
    plus: 200,
    vip: 500,
  },
  photo: {
    free: 0,
    plus: 10,
    vip: 30,
  },
};

const cachedDynamicLimits: Record<QuotaType, Record<"free" | "plus" | "vip", number>> = {
  chat: { free: 20, plus: 200, vip: 500 },
  photo: { free: 0, plus: 10, vip: 30 },
};
let lastLimitsFetchTime = 0;

export function getDynamicQuotaLimit(type: QuotaType, tier: "free" | "plus" | "vip"): number {
  const now = Date.now();
  if (now - lastLimitsFetchTime > 10000) {
    try {
      const plansFilePath = path.join(process.cwd(), ".data", "plans.json");
      if (fs.existsSync(plansFilePath)) {
        const raw = fs.readFileSync(plansFilePath, "utf-8");
        const plans = JSON.parse(raw);
        if (Array.isArray(plans)) {
          const plusPlan = plans.find((p) => p.id === "plus");
          const vipPlan = plans.find((p) => p.id === "vip" || p.id === "vip_plus");
          if (plusPlan?.dailyMessages) cachedDynamicLimits.chat.plus = Number(plusPlan.dailyMessages);
          if (plusPlan?.dailyPhotos !== undefined) cachedDynamicLimits.photo.plus = Number(plusPlan.dailyPhotos);
          if (vipPlan?.dailyMessages) cachedDynamicLimits.chat.vip = Number(vipPlan.dailyMessages);
          if (vipPlan?.dailyPhotos !== undefined) cachedDynamicLimits.photo.vip = Number(vipPlan.dailyPhotos);
        }
      }
      lastLimitsFetchTime = now;
    } catch {}
  }

  return cachedDynamicLimits[type]?.[tier] ?? DEFAULT_QUOTA_LIMITS[type][tier];
}


// Memory cache
const memoryStores: Record<QuotaType, Map<string, QuotaRecord>> = {
  chat: new Map<string, QuotaRecord>(),
  photo: new Map<string, QuotaRecord>(),
};

const storeLoaded: Record<QuotaType, boolean> = {
  chat: false,
  photo: false,
};

function getQuotaFilePath(type: QuotaType): string {
  const fileName = type === "chat" ? "rate_limits.json" : "photo_limits.json";
  if (process.env.VERCEL) {
    return path.join("/tmp", `zovik_${fileName}`);
  }
  return path.join(process.cwd(), ".data", fileName);
}

function loadStore(type: QuotaType): void {
  try {
    const filePath = getQuotaFilePath(type);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8") || "{}");
      const now = Date.now();
      for (const [key, val] of Object.entries(data)) {
        const rec = val as QuotaRecord;
        if (rec && rec.resetAt > now) {
          memoryStores[type].set(key, rec);
        }
      }
    }
  } catch (err) {
    console.warn(`[QuotaManager] Error loading ${type} limits:`, err);
  }
}

function persistStore(type: QuotaType): void {
  const filePath = getQuotaFilePath(type);
  const tmpPath = `${filePath}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const obj: Record<string, QuotaRecord> = {};
    const now = Date.now();
    for (const [key, val] of memoryStores[type].entries()) {
      if (val.resetAt > now) {
        obj[key] = val;
      }
    }

    fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error(`[QuotaManager] Failed to persist ${type} limits:`, err);
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

/**
 * Derives a reliable, abuse-resistant identifier for anonymous vs authenticated users
 */
export function getAuthoritativeIdentifier(req: NextRequest, verifiedUserId?: string): string {
  if (verifiedUserId) {
    return `usr_${verifiedUserId}`;
  }
  const forwarded = req.headers.get("x-forwarded-for");
  const rawIp = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
  // Anonymize IP slightly for privacy while maintaining abuse prevention
  return `ip_${rawIp.replace(/[^a-zA-Z0-9.:_-]/g, "_")}`;
}

/**
 * 1. CHECK ONLY: Does not consume quota prematurely.
 * Guarantees that users are never charged for failed or timed-out API calls.
 */
export function checkQuotaAllowed(
  type: QuotaType,
  identifier: string,
  tier: "free" | "plus" | "vip"
): { allowed: boolean; remaining: number; limit: number; resetInMs: number } {
  if (!storeLoaded[type]) {
    loadStore(type);
    storeLoaded[type] = true;
  }

  const limit = getDynamicQuotaLimit(type, tier);
  const now = Date.now();
  const record = memoryStores[type].get(identifier);

  if (!record || now >= record.resetAt) {
    return {
      allowed: limit > 0,
      remaining: limit,
      limit,
      resetInMs: 24 * 60 * 60 * 1000,
    };
  }

  const remaining = Math.max(0, limit - record.count);
  return {
    allowed: remaining > 0,
    remaining,
    limit,
    resetInMs: Math.max(0, record.resetAt - now),
  };
}

/**
 * 2. CONSUME ON SUCCESS: Only call this AFTER Groq or image delivery succeeded!
 */
export function consumeQuotaOnSuccess(
  type: QuotaType,
  identifier: string,
  tier: "free" | "plus" | "vip"
): { remaining: number; limit: number } {
  if (!storeLoaded[type]) {
    loadStore(type);
    storeLoaded[type] = true;
  }

  const limit = getDynamicQuotaLimit(type, tier);
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  let record = memoryStores[type].get(identifier);
  if (!record || now >= record.resetAt) {
    record = {
      count: 1,
      resetAt: now + twentyFourHours,
      tier,
    };
  } else {
    record.count += 1;
    record.tier = tier;
  }

  memoryStores[type].set(identifier, record);
  persistStore(type);

  return {
    remaining: Math.max(0, limit - record.count),
    limit,
  };
}
