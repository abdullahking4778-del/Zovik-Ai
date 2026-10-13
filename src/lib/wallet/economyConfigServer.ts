import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  EconomyConfig,
  DEFAULT_ECONOMY_CONFIG,
  DEFAULT_PACKAGES,
} from "./economyConfig";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { adminDb } from "@/lib/firebaseAdmin";

export * from "./economyConfig";

function getEconomyConfigStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_economy_config.json");
  }
  return path.join(process.cwd(), ".data", "economy_config.json");
}

let cachedEconomyConfig: EconomyConfig = { ...DEFAULT_ECONOMY_CONFIG };
let lastLoadedTime = 0;

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

// Initial hydration from local file
try {
  cachedEconomyConfig = safeReadJsonFile<EconomyConfig>(
    getEconomyConfigStoragePath(),
    DEFAULT_ECONOMY_CONFIG
  );
} catch {}

/**
 * Sync economy configuration from authoritative cloud store (Supabase / Firestore)
 * Ensures cross-instance serverless consistency across multiple Vercel lambdas.
 */
async function syncEconomyFromCloud(): Promise<EconomyConfig> {
  const now = Date.now();
  if (now - lastLoadedTime < 30000 && lastLoadedTime > 0) {
    return cachedEconomyConfig;
  }

  // 1. Fetch from Supabase app_settings
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "economy_config")
        .maybeSingle();

      if (!error && data?.value) {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        cachedEconomyConfig = {
          ...DEFAULT_ECONOMY_CONFIG,
          ...parsed,
          packages: Array.isArray(parsed.packages) && parsed.packages.length > 0 ? parsed.packages : DEFAULT_PACKAGES,
        };
        lastLoadedTime = now;
        safeWriteJsonFile(getEconomyConfigStoragePath(), cachedEconomyConfig);
        return cachedEconomyConfig;
      }
    } catch {}
  }

  // 2. Fetch from Firestore via Firebase Admin SDK
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docSnap = await adminDb.collection("config").doc("economy").get();
      if (docSnap.exists) {
        const data = docSnap.data() as Partial<EconomyConfig>;
        if (data && typeof data === "object") {
          cachedEconomyConfig = {
            ...DEFAULT_ECONOMY_CONFIG,
            ...data,
            packages: Array.isArray(data.packages) && data.packages.length > 0 ? data.packages : DEFAULT_PACKAGES,
          };
          lastLoadedTime = now;
          safeWriteJsonFile(getEconomyConfigStoragePath(), cachedEconomyConfig);
          return cachedEconomyConfig;
        }
      }
    }
  } catch {}

  lastLoadedTime = now;
  return cachedEconomyConfig;
}

/**
 * Reads persistent economy configuration with memory cache & cloud synchronization
 */
export function getEconomyConfig(): EconomyConfig {
  const now = Date.now();
  if (now - lastLoadedTime > 30000) {
    // Background cloud sync to keep serverless lambdas up-to-date
    syncEconomyFromCloud().catch(() => {});
  }
  return cachedEconomyConfig;
}

/**
 * Saves economy configuration with cross-instance cloud persistence and atomic disk write
 */
export async function saveEconomyConfig(updates: Partial<EconomyConfig>): Promise<EconomyConfig> {
  const current = getEconomyConfig();
  const nextConfig: EconomyConfig = {
    ...current,
    ...updates,
    packages: Array.isArray(updates.packages) && updates.packages.length > 0 ? updates.packages : current.packages,
  };

  const targetPath = getEconomyConfigStoragePath();
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Atomic local write
  const tmpPath = `${targetPath}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(nextConfig, null, 2), "utf-8");
    fs.renameSync(tmpPath, targetPath);
  } catch (writeErr) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    console.error("[EconomyConfig] Failed to persist economy configuration to disk:", writeErr);
    throw new Error(
      `Failed to persist economy configuration: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`
    );
  }

  // 2. Cross-instance Cloud Persistence: Supabase PostgreSQL app_settings
  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("app_settings").upsert(
        {
          key: "economy_config",
          value: JSON.stringify(nextConfig),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    } catch (err) {
      console.warn("[EconomyConfig] Supabase cloud sync notice:", err);
    }
  }

  // 3. Dual-sync to Firestore (if configured)
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("economy").set(nextConfig, { merge: true });
    }
  } catch {}

  cachedEconomyConfig = nextConfig;
  lastLoadedTime = Date.now();
  return nextConfig;
}
