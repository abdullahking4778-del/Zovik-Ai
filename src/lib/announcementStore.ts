import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AnnouncementConfig } from "@/types";
import { adminDb } from "./firebaseAdmin";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

const DEFAULT_ANNOUNCEMENT: AnnouncementConfig = {
  enabled: true,
  text: "🎉 FLASH DEAL: VIP Elite Plan 50% Off — Only Rs. 400 for Today! Tap here to Unlock 18+ Uncensored Chat 💕",
  badge: "FLASH DEAL 🔥",
  actionType: "open_premium",
  updatedAt: new Date().toISOString(),
};

let cachedAnnouncement: AnnouncementConfig = DEFAULT_ANNOUNCEMENT;
let lastAnnouncementFetch = 0;

function getAnnouncementStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_announcement.json");
  }
  return path.join(process.cwd(), ".data", "announcement.json");
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

// Initial read from local file
try {
  cachedAnnouncement = safeReadJsonFile<AnnouncementConfig>(
    getAnnouncementStoragePath(),
    DEFAULT_ANNOUNCEMENT
  );
} catch {}

/**
 * Fetch announcement from authoritative cloud store (Firestore / Supabase)
 */
async function syncAnnouncementFromCloud(): Promise<AnnouncementConfig> {
  const now = Date.now();
  if (now - lastAnnouncementFetch < 30000 && lastAnnouncementFetch > 0) {
    return cachedAnnouncement;
  }

  // 1. Fetch from Firestore via Firebase Admin SDK
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docSnap = await adminDb.collection("config").doc("announcement").get();
      if (docSnap.exists) {
        const data = docSnap.data() as AnnouncementConfig;
        if (data && typeof data.text === "string") {
          cachedAnnouncement = {
            ...DEFAULT_ANNOUNCEMENT,
            ...data,
          };
          lastAnnouncementFetch = now;
          safeWriteJsonFile(getAnnouncementStoragePath(), cachedAnnouncement);
          return cachedAnnouncement;
        }
      }
    }
  } catch (err) {
    console.warn("[AnnouncementStore] Cloud Firestore read notice:", err);
  }

  // 2. Fetch from Supabase (if configured)
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "announcement")
        .maybeSingle();
      if (!error && data?.value) {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        cachedAnnouncement = { ...DEFAULT_ANNOUNCEMENT, ...parsed };
        lastAnnouncementFetch = now;
        safeWriteJsonFile(getAnnouncementStoragePath(), cachedAnnouncement);
        return cachedAnnouncement;
      }
    } catch {}
  }

  return cachedAnnouncement;
}

export function getPersistentAnnouncement(): AnnouncementConfig {
  // Trigger background cloud refresh if cache might be stale
  if (Date.now() - lastAnnouncementFetch > 30000) {
    syncAnnouncementFromCloud().catch(() => {});
  }
  return cachedAnnouncement;
}

export async function getPersistentAnnouncementAsync(): Promise<AnnouncementConfig> {
  return syncAnnouncementFromCloud();
}

/**
 * Persists announcement to authoritative cloud storage (Firestore & Supabase)
 * with local memory and disk fallback.
 */
export async function savePersistentAnnouncementAsync(
  update: Partial<AnnouncementConfig>
): Promise<{ success: boolean; announcement: AnnouncementConfig; cloudSaved: boolean; error?: string }> {
  const current = cachedAnnouncement;
  const updated: AnnouncementConfig = {
    ...current,
    ...update,
    updatedAt: new Date().toISOString(),
  };

  cachedAnnouncement = updated;
  lastAnnouncementFetch = Date.now();

  // Save to local cache
  const filePath = getAnnouncementStoragePath();
  safeWriteJsonFile(filePath, updated);

  let cloudSaved = false;
  let cloudError: string | undefined;

  // 1. Save to Firestore (Authoritative for serverless)
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("announcement").set(updated, { merge: true });
      cloudSaved = true;
    }
  } catch (err) {
    cloudError = err instanceof Error ? err.message : String(err);
    console.warn("[AnnouncementStore] Cloud Firestore write warning:", err);
  }

  // 2. Save to Supabase (if configured)
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseAdmin.from("app_settings").upsert({
        key: "announcement",
        value: updated,
        updated_at: new Date().toISOString(),
      });
      if (!error) {
        cloudSaved = true;
      }
    } catch (sbErr) {
      if (!cloudError) {
        cloudError = sbErr instanceof Error ? sbErr.message : String(sbErr);
      }
    }
  }

  // On Vercel, serverless instances are ephemeral. If cloud save failed, report error.
  if (process.env.VERCEL && !cloudSaved) {
    return {
      success: false,
      announcement: updated,
      cloudSaved: false,
      error: cloudError || "Failed to persist announcement to durable cloud database",
    };
  }

  return {
    success: true,
    announcement: updated,
    cloudSaved,
  };
}

export function savePersistentAnnouncement(update: Partial<AnnouncementConfig>): AnnouncementConfig {
  const current = cachedAnnouncement;
  const updated: AnnouncementConfig = {
    ...current,
    ...update,
    updatedAt: new Date().toISOString(),
  };

  cachedAnnouncement = updated;
  lastAnnouncementFetch = Date.now();
  safeWriteJsonFile(getAnnouncementStoragePath(), updated);

  // Trigger background cloud sync
  savePersistentAnnouncementAsync(update).catch(() => {});

  return updated;
}
