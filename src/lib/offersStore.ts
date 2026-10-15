import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";
import { adminDb } from "./firebaseAdmin";
import { Offer, OfferValidationResult, DiscountType, AudienceType } from "@/types";

function getOffersStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_offers.json");
  }
  return path.join(process.cwd(), ".data", "offers.json");
}

function getRedemptionsStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_offer_redemptions.json");
  }
  return path.join(process.cwd(), ".data", "offer_redemptions.json");
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

export interface RedemptionRecord {
  code: string;
  userEmail: string;
  redeemedAt: string;
}

const DEFAULT_OFFERS: Offer[] = [
  {
    id: "off_welcome50",
    code: "WELCOME50",
    title: "🎉 Welcome 50% Off First Package",
    description: "Get 50% instant discount on any coin package or VIP upgrade.",
    discountType: "percentage",
    discountValue: 50,
    minPurchasePKR: 100,
    maxRedemptions: 500,
    currentRedemptions: 12,
    perUserLimit: 1,
    validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: "all",
    applicablePlanIds: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "off_zovik100",
    code: "ZOVIK100",
    title: "🪙 100 Free Bonus Coins",
    description: "Adds 100 bonus coins to your order automatically on checkout.",
    discountType: "bonus_coins",
    discountValue: 100,
    minPurchasePKR: 200,
    maxRedemptions: 1000,
    currentRedemptions: 48,
    perUserLimit: 2,
    validFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: "all",
    applicablePlanIds: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "off_flash30",
    code: "FLASH30",
    title: "⚡ Flash 30% Off Weekend Special",
    description: "Special limited-time 30% discount on all plans.",
    discountType: "percentage",
    discountValue: 30,
    minPurchasePKR: 150,
    maxRedemptions: 200,
    currentRedemptions: 5,
    perUserLimit: 1,
    validFrom: new Date().toISOString(),
    validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: "all",
    applicablePlanIds: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryOffersCache: Offer[] | null = null;
let lastOffersFetchTime = 0;

/**
 * Fetch all persistent offers (Admin view)
 */
export async function getPersistentOffers(): Promise<Offer[]> {
  const now = Date.now();
  if (inMemoryOffersCache && now - lastOffersFetchTime < 10000) {
    return inMemoryOffersCache;
  }

  // 1. Supabase Check
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "app_offers")
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value)) {
        inMemoryOffersCache = data.value as Offer[];
        lastOffersFetchTime = now;
        safeWriteJsonFile(getOffersStoragePath(), data.value);
        return inMemoryOffersCache;
      }
    } catch (err) {
      console.warn("[OffersStore] Supabase offers read note:", err);
    }
  }

  // 2. Firebase Admin Check
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docSnap = await adminDb.collection("config").doc("offers").get();
      if (docSnap.exists) {
        const d = docSnap.data();
        if (d && Array.isArray(d.items)) {
          inMemoryOffersCache = d.items as Offer[];
          lastOffersFetchTime = now;
          safeWriteJsonFile(getOffersStoragePath(), d.items);
          return inMemoryOffersCache;
        }
      }
    }
  } catch (err) {
    console.warn("[OffersStore] Firestore offers read note:", err);
  }

  // 3. Local/tmp JSON Fallback
  const localList = safeReadJsonFile<Offer[]>(getOffersStoragePath(), DEFAULT_OFFERS);
  inMemoryOffersCache = localList;
  lastOffersFetchTime = now;
  return localList;
}

/**
 * Save or update an offer/promo code
 */
export async function savePersistentOffer(input: Partial<Offer>): Promise<Offer> {
  const existing = await getPersistentOffers();
  const id = (input.id || `off_${crypto.randomUUID().slice(0, 8)}`).trim();
  const rawCode = (input.code || "OFFER").trim().toUpperCase();
  const nowStr = new Date().toISOString();

  const offerToSave: Offer = {
    id,
    code: rawCode,
    title: input.title?.trim() || `Promo Code ${rawCode}`,
    description: input.description?.trim() || "",
    discountType: (input.discountType || "percentage") as DiscountType,
    discountValue: Math.max(0, Number(input.discountValue) || 10),
    minPurchasePKR: Math.max(0, Number(input.minPurchasePKR) || 0),
    maxRedemptions: input.maxRedemptions ? Number(input.maxRedemptions) : undefined,
    currentRedemptions: Number(input.currentRedemptions) || 0,
    perUserLimit: input.perUserLimit ? Number(input.perUserLimit) : 1,
    validFrom: input.validFrom || nowStr,
    validTo: input.validTo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: (input.targetAudience || "all") as AudienceType,
    applicablePlanIds: Array.isArray(input.applicablePlanIds) ? input.applicablePlanIds : [],
    isActive: input.isActive !== false,
    createdAt: input.createdAt || nowStr,
    updatedAt: nowStr,
  };

  const idx = existing.findIndex((o) => o.id === id || o.code === rawCode);
  let updatedList: Offer[];
  if (idx >= 0) {
    updatedList = [...existing];
    updatedList[idx] = offerToSave;
  } else {
    updatedList = [offerToSave, ...existing];
  }

  inMemoryOffersCache = updatedList;
  lastOffersFetchTime = Date.now();
  safeWriteJsonFile(getOffersStoragePath(), updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("app_settings").upsert({
        key: "app_offers",
        value: updatedList,
        updated_at: nowStr,
      });
    } catch (err) {
      console.warn("[OffersStore] Supabase save note:", err);
    }
  }

  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("offers").set({
        items: updatedList,
        updatedAt: nowStr,
      });
    }
  } catch (err) {
    console.warn("[OffersStore] Firestore save note:", err);
  }

  return offerToSave;
}

/**
 * Delete an offer by ID
 */
export async function deletePersistentOffer(id: string): Promise<boolean> {
  const existing = await getPersistentOffers();
  const filtered = existing.filter((o) => o.id !== id && o.code !== id);

  inMemoryOffersCache = filtered;
  lastOffersFetchTime = Date.now();
  safeWriteJsonFile(getOffersStoragePath(), filtered);

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("app_settings").upsert({
        key: "app_offers",
        value: filtered,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[OffersStore] Supabase delete note:", err);
    }
  }

  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("offers").set({
        items: filtered,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("[OffersStore] Firestore delete note:", err);
  }

  return true;
}

/**
 * Validates a promo code during checkout
 */
export async function validateOfferCode(
  rawCode: string,
  amountPKR: number,
  userEmail?: string,
  userTier?: string
): Promise<OfferValidationResult> {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) {
    return { valid: false, error: "Please enter a promo code." };
  }

  const offers = await getPersistentOffers();
  const targetOffer = offers.find((o) => o.code === code);

  if (!targetOffer) {
    return { valid: false, error: "Invalid promo code. Please check and try again." };
  }

  if (!targetOffer.isActive) {
    return { valid: false, error: "This promo code is currently inactive." };
  }

  const now = Date.now();
  const start = new Date(targetOffer.validFrom).getTime();
  const end = new Date(targetOffer.validTo).getTime();

  if (now < start) {
    return { valid: false, error: "This promo offer has not started yet." };
  }

  if (now > end) {
    return { valid: false, error: "This promo code has expired." };
  }

  if (targetOffer.maxRedemptions && targetOffer.currentRedemptions >= targetOffer.maxRedemptions) {
    return { valid: false, error: "This promo code has reached its maximum redemption limit." };
  }

  if (targetOffer.minPurchasePKR && amountPKR < targetOffer.minPurchasePKR) {
    return {
      valid: false,
      error: `Minimum order amount of Rs. ${targetOffer.minPurchasePKR} is required for this code.`,
    };
  }

  // Check per-user redemption limit if user email is provided
  if (userEmail && targetOffer.perUserLimit) {
    const redemptions = safeReadJsonFile<RedemptionRecord[]>(getRedemptionsStoragePath(), []);
    const cleanEmail = userEmail.trim().toLowerCase();
    const userUses = redemptions.filter(
      (r) => r.code === code && r.userEmail.toLowerCase() === cleanEmail
    ).length;

    if (userUses >= targetOffer.perUserLimit) {
      return {
        valid: false,
        error: `You have already redeemed this promo code the maximum allowed times (${targetOffer.perUserLimit}).`,
      };
    }
  }

  // Check audience restriction
  if (targetOffer.targetAudience === "vip" && userTier !== "vip" && userTier !== "plus") {
    return { valid: false, error: "This exclusive code is only available for VIP members." };
  }
  if (targetOffer.targetAudience === "free" && (userTier === "vip" || userTier === "plus")) {
    return { valid: false, error: "This introductory code is only valid for new/free users." };
  }

  // Compute discount and final prices
  let discountAmountPKR = 0;
  let bonusCoins = 0;

  if (targetOffer.discountType === "percentage") {
    discountAmountPKR = Math.round((amountPKR * targetOffer.discountValue) / 100);
  } else if (targetOffer.discountType === "flat_pkr") {
    discountAmountPKR = Math.min(amountPKR, targetOffer.discountValue);
  } else if (targetOffer.discountType === "flat_usd") {
    discountAmountPKR = Math.min(amountPKR, Math.round(targetOffer.discountValue * 280));
  } else if (targetOffer.discountType === "bonus_coins") {
    bonusCoins = targetOffer.discountValue;
  }

  const finalPricePKR = Math.max(0, amountPKR - discountAmountPKR);
  const finalPriceUSD = Number((finalPricePKR / 280).toFixed(2));
  const discountAmountUSD = Number((discountAmountPKR / 280).toFixed(2));

  return {
    valid: true,
    offer: {
      id: targetOffer.id,
      code: targetOffer.code,
      title: targetOffer.title,
      discountType: targetOffer.discountType,
      discountValue: targetOffer.discountValue,
      discountAmountPKR,
      discountAmountUSD,
      finalPricePKR,
      finalPriceUSD,
      bonusCoins,
    },
  };
}

/**
 * Records a successful promo code redemption
 */
export async function recordOfferRedemption(rawCode: string, userEmail: string = "anonymous"): Promise<boolean> {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return false;

  const existingOffers = await getPersistentOffers();
  const targetOffer = existingOffers.find((o) => o.code === code);
  if (!targetOffer) return false;

  targetOffer.currentRedemptions = (targetOffer.currentRedemptions || 0) + 1;
  targetOffer.updatedAt = new Date().toISOString();

  await savePersistentOffer(targetOffer);

  // Record redemption entry
  const redemptions = safeReadJsonFile<RedemptionRecord[]>(getRedemptionsStoragePath(), []);
  redemptions.push({
    code,
    userEmail: userEmail.trim().toLowerCase(),
    redeemedAt: new Date().toISOString(),
  });
  safeWriteJsonFile(getRedemptionsStoragePath(), redemptions);

  return true;
}

/**
 * Retrieves all stored redemption records
 */
export async function getRedemptionRecords(): Promise<RedemptionRecord[]> {
  return safeReadJsonFile<RedemptionRecord[]>(getRedemptionsStoragePath(), []);
}
