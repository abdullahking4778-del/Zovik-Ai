import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";
import { PricingPlan } from "@/types";
import defaultPlans from "@/data/plans.json";

function getPlansStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_plans.json");
  }
  return path.join(process.cwd(), "src", "data", "plans.json");
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

/**
 * Retrieve all pricing plans.
 * Prioritizes Supabase Cloud Database, with local fallback.
 */
export async function getPersistentPlans(): Promise<PricingPlan[]> {
  // 1. Try Supabase
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("pricing_plans")
        .select("*")
        .order("price_pkr", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          name: d.name,
          badge: d.badge || undefined,
          badgeColor: d.badge_color || "orange",
          pricePKR: Number(d.price_pkr),
          originalPricePKR: Number(d.original_price_pkr) || Number(d.price_pkr) * 2,
          priceUSD: Number(d.price_usd),
          originalPriceUSD: Number(d.original_price_usd) || Number(d.price_usd) * 2,
          durationDays: Number(d.duration_days) || 30,
          features: Array.isArray(d.features) ? d.features : [],
          isPopular: Boolean(d.is_popular),
          isActive: d.is_active !== false,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    } catch (err) {
      console.warn("[PlansStore] Supabase plans read note:", err);
    }
  }

  // 2. Local Fallback
  const storagePath = getPlansStoragePath();
  const list = safeReadJsonFile<PricingPlan[]>(storagePath, []);
  if (list && list.length > 0) return list;

  return defaultPlans as PricingPlan[];
}

/**
 * Save or update a pricing plan.
 */
export async function savePersistentPlan(plan: PricingPlan): Promise<PricingPlan> {
  const planWithTimestamps: PricingPlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
    createdAt: plan.createdAt || new Date().toISOString(),
  };

  // 1. Save to Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("pricing_plans").upsert({
        id: planWithTimestamps.id,
        name: planWithTimestamps.name,
        badge: planWithTimestamps.badge || null,
        badge_color: planWithTimestamps.badgeColor || "orange",
        price_pkr: planWithTimestamps.pricePKR,
        original_price_pkr: planWithTimestamps.originalPricePKR,
        price_usd: planWithTimestamps.priceUSD,
        original_price_usd: planWithTimestamps.originalPriceUSD,
        duration_days: planWithTimestamps.durationDays,
        features: planWithTimestamps.features || [],
        is_popular: Boolean(planWithTimestamps.isPopular),
        is_active: planWithTimestamps.isActive !== false,
        updated_at: planWithTimestamps.updatedAt,
      });
    } catch (err) {
      console.warn("[PlansStore] Supabase save plan note:", err);
    }
  }

  // 2. Save to local fallback file
  try {
    const filePath = getPlansStoragePath();
    const existing = await getPersistentPlans();
    const updated = [
      planWithTimestamps,
      ...existing.filter((p) => p.id !== planWithTimestamps.id),
    ];
    safeWriteJsonFile(filePath, updated);
  } catch {}

  // 3. Keep root plans.json updated in local dev
  try {
    const rootPath = path.join(process.cwd(), "src", "data", "plans.json");
    const existing = safeReadJsonFile<PricingPlan[]>(rootPath, []);
    const updated = [
      planWithTimestamps,
      ...existing.filter((p) => p.id !== planWithTimestamps.id),
    ];
    safeWriteJsonFile(rootPath, updated);
  } catch {}

  return planWithTimestamps;
}

/**
 * Delete a pricing plan.
 */
export async function deletePersistentPlan(planId: string): Promise<boolean> {
  const cleanId = planId.trim();

  // 1. Delete from Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("pricing_plans").delete().eq("id", cleanId);
    } catch (err) {
      console.warn("[PlansStore] Supabase delete plan note:", err);
    }
  }

  // 2. Delete from local storage
  try {
    const filePath = getPlansStoragePath();
    const list = safeReadJsonFile<PricingPlan[]>(filePath, []);
    if (Array.isArray(list)) {
      const filtered = list.filter((p) => p.id !== cleanId);
      safeWriteJsonFile(filePath, filtered);
    }
  } catch {}

  // 3. Delete from root plans.json
  try {
    const rootPath = path.join(process.cwd(), "src", "data", "plans.json");
    const list = safeReadJsonFile<PricingPlan[]>(rootPath, []);
    if (Array.isArray(list)) {
      const filtered = list.filter((p) => p.id !== cleanId);
      safeWriteJsonFile(rootPath, filtered);
    }
  } catch {}

  return true;
}
