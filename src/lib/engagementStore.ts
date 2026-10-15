import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";
import { adminDb } from "./firebaseAdmin";
import { InAppNotification, SmartBannerConfig, PromoModalConfig } from "@/types";

function getNotificationsStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_notifications.json");
  }
  return path.join(process.cwd(), ".data", "notifications.json");
}

function getBannerStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_smart_banner.json");
  }
  return path.join(process.cwd(), ".data", "smart_banner.json");
}

function getPromoModalStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_promo_modal.json");
  }
  return path.join(process.cwd(), ".data", "promo_modal.json");
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

// Default Seed Data
const DEFAULT_NOTIFICATIONS: InAppNotification[] = [
  {
    id: "notif_welcome",
    title: "🎉 Welcome to Zovik AI VIP Experience",
    message: "Ultra-realistic voice calls, uncensored photo generation, and smart memory chat are now available for all companions.",
    type: "info",
    targetAudience: "all",
    linkUrl: "/app",
    actionText: "Start Chatting",
    badge: "WELCOME",
    priority: "high",
    isActive: true,
    createdAt: new Date().toISOString(),
    readBy: [],
  },
  {
    id: "notif_flash",
    title: "🔥 Weekend Flash Sale is Live!",
    message: "Recharge your wallet today and get 50% discount with promo code WELCOME50 on checkout.",
    type: "promo",
    targetAudience: "all",
    linkUrl: "/?modal=store",
    actionText: "Claim 50% Off",
    badge: "50% OFF",
    priority: "high",
    isActive: true,
    createdAt: new Date().toISOString(),
    readBy: [],
  },
  {
    id: "notif_drop",
    title: "✨ Arya & Sakura Anime Drops Released",
    message: "Explore our newest anime & realistic companion drops with updated galleries and custom voices.",
    type: "event",
    targetAudience: "all",
    linkUrl: "/app",
    actionText: "Meet Companions",
    badge: "NEW DROP",
    priority: "normal",
    isActive: true,
    createdAt: new Date().toISOString(),
    readBy: [],
  },
];

const DEFAULT_BANNER: SmartBannerConfig = {
  id: "banner_default",
  title: "Weekend Flash Sale: Get 50% Extra Coins with code WELCOME50!",
  subtitle: "1 PKR = 1 Coin. Zero fees via EasyPaisa, JazzCash & Binance Pay.",
  style: "ticker",
  highlightText: "LIMITED TIME",
  badge: "FLASH DEAL",
  ctaText: "Claim 50% Off",
  ctaLink: "/?modal=store",
  targetAudience: "all",
  countdownTarget: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true,
  isDismissible: true,
  updatedAt: new Date().toISOString(),
};

const DEFAULT_PROMO_MODAL: PromoModalConfig = {
  id: "modal_default",
  title: "🎉 Exclusive VIP Companion Drop!",
  body: "Experience ultra-realistic voice chats and uncensored photo sessions with our newly dropped VIP companions. Grab the Starter or Whale pack today to unlock all galleries.",
  badge: "VIP SPECIAL",
  ctaText: "Get Extra Coins Now",
  ctaLink: "/?modal=store",
  isActive: false,
  showOncePerSession: true,
  updatedAt: new Date().toISOString(),
};

// In-Memory Caches
let inMemoryNotifsCache: InAppNotification[] | null = null;
let lastNotifsFetchTime = 0;
let inMemoryBannerCache: SmartBannerConfig | null = null;
let lastBannerFetchTime = 0;
let inMemoryPromoModalCache: PromoModalConfig | null = null;
let lastPromoModalFetchTime = 0;
const CACHE_TTL_MS = 15000;

// ============================================================================
// NOTIFICATIONS CRUD
// ============================================================================

export async function getPersistentNotifications(): Promise<InAppNotification[]> {
  const now = Date.now();
  if (inMemoryNotifsCache && now - lastNotifsFetchTime < CACHE_TTL_MS) {
    return inMemoryNotifsCache;
  }

  // 1. Supabase Check
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "app_engagement_notifications")
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value)) {
        inMemoryNotifsCache = data.value as InAppNotification[];
        lastNotifsFetchTime = now;
        safeWriteJsonFile(getNotificationsStoragePath(), data.value);
        return inMemoryNotifsCache;
      }
    } catch (err) {
      console.warn("[EngagementStore] Supabase notifications note:", err);
    }
  }

  // 2. Firebase Check
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docSnap = await adminDb.collection("config").doc("notifications").get();
      if (docSnap.exists) {
        const d = docSnap.data();
        if (d && Array.isArray(d.items)) {
          inMemoryNotifsCache = d.items as InAppNotification[];
          lastNotifsFetchTime = now;
          safeWriteJsonFile(getNotificationsStoragePath(), d.items);
          return inMemoryNotifsCache;
        }
      }
    }
  } catch (err) {
    console.warn("[EngagementStore] Firestore notifications note:", err);
  }

  // 3. Local/tmp JSON Fallback
  const localList = safeReadJsonFile<InAppNotification[]>(getNotificationsStoragePath(), DEFAULT_NOTIFICATIONS);
  inMemoryNotifsCache = localList;
  lastNotifsFetchTime = now;
  return localList;
}

export async function savePersistentNotification(input: Partial<InAppNotification>): Promise<InAppNotification> {
  const existing = await getPersistentNotifications();
  const id = (input.id || `notif_${crypto.randomUUID().slice(0, 8)}`).trim();
  const nowStr = new Date().toISOString();

  const notifToSave: InAppNotification = {
    id,
    title: input.title?.trim() || "Zovik AI Announcement",
    message: input.message?.trim() || "",
    type: input.type || "info",
    targetAudience: input.targetAudience || "all",
    linkUrl: input.linkUrl?.trim() || undefined,
    actionText: input.actionText?.trim() || undefined,
    badge: input.badge?.trim() || undefined,
    priority: input.priority || "normal",
    isActive: input.isActive !== false,
    expiresAt: input.expiresAt || undefined,
    createdAt: input.createdAt || nowStr,
    readBy: Array.isArray(input.readBy) ? input.readBy : [],
  };

  const idx = existing.findIndex((n) => n.id === id);
  let updatedList: InAppNotification[];
  if (idx >= 0) {
    updatedList = [...existing];
    updatedList[idx] = notifToSave;
  } else {
    updatedList = [notifToSave, ...existing];
  }

  inMemoryNotifsCache = updatedList;
  lastNotifsFetchTime = Date.now();
  safeWriteJsonFile(getNotificationsStoragePath(), updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("app_settings").upsert({
        key: "app_engagement_notifications",
        value: updatedList,
        updated_at: nowStr,
      });
    } catch (err) {
      console.warn("[EngagementStore] Supabase save note:", err);
    }
  }

  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("notifications").set({
        items: updatedList,
        updatedAt: nowStr,
      });
    }
  } catch (err) {
    console.warn("[EngagementStore] Firestore save note:", err);
  }

  return notifToSave;
}

export async function deletePersistentNotification(id: string): Promise<boolean> {
  const existing = await getPersistentNotifications();
  const filtered = existing.filter((n) => n.id !== id);

  inMemoryNotifsCache = filtered;
  lastNotifsFetchTime = Date.now();
  safeWriteJsonFile(getNotificationsStoragePath(), filtered);

  const nowStr = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("app_settings").upsert({
        key: "app_engagement_notifications",
        value: filtered,
        updated_at: nowStr,
      });
    } catch {}
  }

  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("notifications").set({
        items: filtered,
        updatedAt: nowStr,
      });
    }
  } catch {}

  return true;
}

export async function markNotificationRead(id: string, userIdentifier: string): Promise<boolean> {
  if (!id || !userIdentifier) return false;
  const existing = await getPersistentNotifications();
  const target = existing.find((n) => n.id === id);
  if (!target) return false;

  const cleanUser = userIdentifier.trim().toLowerCase();
  target.readBy = target.readBy || [];
  if (!target.readBy.includes(cleanUser)) {
    target.readBy.push(cleanUser);
    await savePersistentNotification(target);
  }
  return true;
}

// ============================================================================
// SMART BANNER CONFIG
// ============================================================================

export async function getSmartBannerConfig(): Promise<SmartBannerConfig> {
  const now = Date.now();
  if (inMemoryBannerCache && now - lastBannerFetchTime < CACHE_TTL_MS) {
    return inMemoryBannerCache;
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "app_smart_banner")
        .maybeSingle();

      if (!error && data?.value && typeof data.value === "object") {
        inMemoryBannerCache = data.value as SmartBannerConfig;
        lastBannerFetchTime = now;
        safeWriteJsonFile(getBannerStoragePath(), data.value);
        return inMemoryBannerCache;
      }
    } catch (err) {
      console.warn("[EngagementStore] Supabase banner note:", err);
    }
  }

  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docSnap = await adminDb.collection("config").doc("smart_banner").get();
      if (docSnap.exists) {
        const d = docSnap.data();
        if (d && typeof d.config === "object") {
          inMemoryBannerCache = d.config as SmartBannerConfig;
          lastBannerFetchTime = now;
          safeWriteJsonFile(getBannerStoragePath(), d.config);
          return inMemoryBannerCache;
        }
      }
    }
  } catch (err) {
    console.warn("[EngagementStore] Firestore banner note:", err);
  }

  const local = safeReadJsonFile<SmartBannerConfig>(getBannerStoragePath(), DEFAULT_BANNER);
  inMemoryBannerCache = local;
  lastBannerFetchTime = now;
  return local;
}

export async function saveSmartBannerConfig(input: Partial<SmartBannerConfig>): Promise<SmartBannerConfig> {
  const existing = await getSmartBannerConfig();
  const nowStr = new Date().toISOString();

  const updated: SmartBannerConfig = {
    ...existing,
    ...input,
    id: existing.id || "banner_default",
    updatedAt: nowStr,
  };

  inMemoryBannerCache = updated;
  lastBannerFetchTime = Date.now();
  safeWriteJsonFile(getBannerStoragePath(), updated);

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("app_settings").upsert({
        key: "app_smart_banner",
        value: updated,
        updated_at: nowStr,
      });
    } catch {}
  }

  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("smart_banner").set({
        config: updated,
        updatedAt: nowStr,
      });
    }
  } catch {}

  return updated;
}

// ============================================================================
// PROMO MODAL POPUP CONFIG
// ============================================================================

export async function getPromoModalConfig(): Promise<PromoModalConfig> {
  const now = Date.now();
  if (inMemoryPromoModalCache && now - lastPromoModalFetchTime < CACHE_TTL_MS) {
    return inMemoryPromoModalCache;
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "app_promo_modal")
        .maybeSingle();

      if (!error && data?.value && typeof data.value === "object") {
        inMemoryPromoModalCache = data.value as PromoModalConfig;
        lastPromoModalFetchTime = now;
        safeWriteJsonFile(getPromoModalStoragePath(), data.value);
        return inMemoryPromoModalCache;
      }
    } catch (err) {
      console.warn("[EngagementStore] Supabase promo modal note:", err);
    }
  }

  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docSnap = await adminDb.collection("config").doc("promo_modal").get();
      if (docSnap.exists) {
        const d = docSnap.data();
        if (d && typeof d.config === "object") {
          inMemoryPromoModalCache = d.config as PromoModalConfig;
          lastPromoModalFetchTime = now;
          safeWriteJsonFile(getPromoModalStoragePath(), d.config);
          return inMemoryPromoModalCache;
        }
      }
    }
  } catch (err) {
    console.warn("[EngagementStore] Firestore promo modal note:", err);
  }

  const local = safeReadJsonFile<PromoModalConfig>(getPromoModalStoragePath(), DEFAULT_PROMO_MODAL);
  inMemoryPromoModalCache = local;
  lastPromoModalFetchTime = now;
  return local;
}

export async function savePromoModalConfig(input: Partial<PromoModalConfig>): Promise<PromoModalConfig> {
  const existing = await getPromoModalConfig();
  const nowStr = new Date().toISOString();

  const updated: PromoModalConfig = {
    ...existing,
    ...input,
    id: existing.id || "modal_default",
    updatedAt: nowStr,
  };

  inMemoryPromoModalCache = updated;
  lastPromoModalFetchTime = Date.now();
  safeWriteJsonFile(getPromoModalStoragePath(), updated);

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("app_settings").upsert({
        key: "app_promo_modal",
        value: updated,
        updated_at: nowStr,
      });
    } catch {}
  }

  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("promo_modal").set({
        config: updated,
        updatedAt: nowStr,
      });
    }
  } catch {}

  return updated;
}
