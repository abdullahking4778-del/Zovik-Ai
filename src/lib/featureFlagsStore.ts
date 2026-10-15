import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";
import { adminDb } from "./firebaseAdmin";
import { FeatureFlag } from "@/types";

function getFlagsStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_feature_flags.json");
  }
  return path.join(process.cwd(), ".data", "feature_flags.json");
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

export const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  {
    key: "events_system_enabled",
    name: "Live Events & Drops System",
    description: "Display dynamic seasonal events, limited-time character drops, and countdown widgets.",
    category: "features",
    enabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: "System Default",
  },
  {
    key: "voice_chat_enabled",
    name: "AI Voice Generation & Playback",
    description: "Enable natural companion voice notes and speech responses during conversations.",
    category: "ai",
    enabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: "System Default",
  },
  {
    key: "wallet_coins_enabled",
    name: "Virtual Coin Economy & Gifting",
    description: "Allow users to purchase, earn, and spend virtual coins for VIP unlocks and character gifts.",
    category: "monetization",
    enabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: "System Default",
  },
  {
    key: "guest_mode_enabled",
    name: "Instant Guest Exploration",
    description: "Permit unregistered visitors to browse companions and send test intro messages.",
    category: "system",
    enabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: "System Default",
  },
  {
    key: "ai_thinking_mode",
    name: "AI Deep Reasoning & Mood Badges",
    description: "Surface emotional state indicators and high-intelligence reasoning badges on companions.",
    category: "ai",
    enabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: "System Default",
  },
  {
    key: "vip_gallery_preview",
    name: "VIP Teaser Gallery Previews",
    description: "Display aesthetic blurred previews of exclusive character photos to encourage upgrades.",
    category: "features",
    enabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: "System Default",
  },
  {
    key: "discount_offers_banner",
    name: "Flash Deals & Announcement Banner",
    description: "Show top sticky announcement banner highlighting active discounts or deals.",
    category: "monetization",
    enabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: "System Default",
  },
  {
    key: "maintenance_mode",
    name: "Emergency Maintenance Kill-Switch",
    description: "Put the public site in maintenance mode while preserving full owner/admin access.",
    category: "system",
    enabled: false,
    rolloutPercentage: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: "System Default",
  },
];

let inMemoryFlagsCache: FeatureFlag[] | null = null;
let lastFlagsFetchTime = 0;

/**
 * Fetch all feature flags (Admin view)
 */
export async function getPersistentFeatureFlags(): Promise<FeatureFlag[]> {
  const now = Date.now();
  if (inMemoryFlagsCache && now - lastFlagsFetchTime < 10000) {
    return inMemoryFlagsCache;
  }

  // 1. Check Supabase
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "feature_flags")
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value)) {
        // Merge with defaults in case new flags were added in code
        const dbFlags = data.value as FeatureFlag[];
        const merged = DEFAULT_FEATURE_FLAGS.map((df) => {
          const match = dbFlags.find((f) => f.key === df.key);
          return match ? { ...df, ...match } : df;
        });

        inMemoryFlagsCache = merged;
        lastFlagsFetchTime = now;
        safeWriteJsonFile(getFlagsStoragePath(), merged);
        return merged;
      }
    } catch (err) {
      console.warn("[FeatureFlagsStore] Supabase flags read note:", err);
    }
  }

  // 2. Check Firebase Admin
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docSnap = await adminDb.collection("config").doc("feature_flags").get();
      if (docSnap.exists) {
        const d = docSnap.data();
        if (d && Array.isArray(d.items)) {
          const dbFlags = d.items as FeatureFlag[];
          const merged = DEFAULT_FEATURE_FLAGS.map((df) => {
            const match = dbFlags.find((f) => f.key === df.key);
            return match ? { ...df, ...match } : df;
          });
          inMemoryFlagsCache = merged;
          lastFlagsFetchTime = now;
          safeWriteJsonFile(getFlagsStoragePath(), merged);
          return merged;
        }
      }
    }
  } catch (err) {
    console.warn("[FeatureFlagsStore] Firestore flags read note:", err);
  }

  // 3. Local/tmp JSON Fallback
  const localList = safeReadJsonFile<FeatureFlag[]>(getFlagsStoragePath(), DEFAULT_FEATURE_FLAGS);
  const merged = DEFAULT_FEATURE_FLAGS.map((df) => {
    const match = localList.find((f) => f.key === df.key);
    return match ? { ...df, ...match } : df;
  });

  inMemoryFlagsCache = merged;
  lastFlagsFetchTime = now;
  return merged;
}

/**
 * Public client-friendly key-value dictionary { [key: string]: boolean }
 */
export async function getPublicFeatureFlags(): Promise<Record<string, boolean>> {
  const flags = await getPersistentFeatureFlags();
  const map: Record<string, boolean> = {};
  for (const f of flags) {
    map[f.key] = f.enabled;
  }
  return map;
}

/**
 * Checks if a specific feature is enabled
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getPersistentFeatureFlags();
  const flag = flags.find((f) => f.key === key);
  return flag ? flag.enabled : false;
}

/**
 * Update or toggle a feature flag
 */
export async function updatePersistentFeatureFlag(
  key: string,
  updates: Partial<FeatureFlag>,
  updatedBy: string = "Admin"
): Promise<FeatureFlag> {
  const existing = await getPersistentFeatureFlags();
  const nowStr = new Date().toISOString();

  let target = existing.find((f) => f.key === key);
  if (!target) {
    target = {
      key,
      name: updates.name || key,
      description: updates.description || "",
      category: updates.category || "features",
      enabled: Boolean(updates.enabled),
      rolloutPercentage: updates.rolloutPercentage ?? 100,
      updatedAt: nowStr,
      updatedBy,
    };
    existing.push(target);
  } else {
    Object.assign(target, {
      ...updates,
      updatedAt: nowStr,
      updatedBy,
    });
  }

  inMemoryFlagsCache = [...existing];
  lastFlagsFetchTime = Date.now();
  safeWriteJsonFile(getFlagsStoragePath(), existing);

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("app_settings").upsert({
        key: "feature_flags",
        value: existing,
        updated_at: nowStr,
      });
    } catch (err) {
      console.warn("[FeatureFlagsStore] Supabase save note:", err);
    }
  }

  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("feature_flags").set({
        items: existing,
        updatedAt: nowStr,
      });
    }
  } catch (err) {
    console.warn("[FeatureFlagsStore] Firestore save note:", err);
  }

  return target;
}
