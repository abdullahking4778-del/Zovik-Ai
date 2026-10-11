import fs from "fs";
import path from "path";
import {
  EconomyConfig,
  DEFAULT_ECONOMY_CONFIG,
  DEFAULT_PACKAGES,
} from "./economyConfig";

export * from "./economyConfig";

const CONFIG_FILE_PATH = path.join(process.cwd(), ".data", "economy_config.json");

let cachedEconomyConfig: EconomyConfig = { ...DEFAULT_ECONOMY_CONFIG };
let lastLoadedTime = 0;

/**
 * Reads persistent economy configuration with memory cache & default fallback (Server only)
 */
export function getEconomyConfig(): EconomyConfig {
  const now = Date.now();
  if (now - lastLoadedTime > 5000) {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        cachedEconomyConfig = {
          ...DEFAULT_ECONOMY_CONFIG,
          ...parsed,
          packages: Array.isArray(parsed.packages) && parsed.packages.length > 0 ? parsed.packages : DEFAULT_PACKAGES,
        };
      }
    } catch {
      // Fallback to in-memory default
    }
    lastLoadedTime = now;
  }
  return cachedEconomyConfig;
}

/**
 * Saves economy configuration (Admin only, Server only)
 */
export function saveEconomyConfig(updates: Partial<EconomyConfig>): EconomyConfig {
  const current = getEconomyConfig();
  const nextConfig: EconomyConfig = {
    ...current,
    ...updates,
  };

  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(nextConfig, null, 2), "utf-8");
  } catch (err) {
    console.error("[EconomyConfig] Failed to save economy config:", err);
  }

  cachedEconomyConfig = nextConfig;
  lastLoadedTime = Date.now();
  return nextConfig;
}
