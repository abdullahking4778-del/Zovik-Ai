import fs from "fs";
import path from "path";

export interface CleanupResult {
  success: boolean;
  tmpFilesRemoved: number;
  cachesPurged: number;
  junkFilesRemoved: number;
  bytesFreed: number;
  timestamp: string;
  details: string[];
}

/**
 * Sweeps the web application to automatically remove orphaned atomic write .tmp files,
 * expired cache records, test junk, and dangling temporary files.
 */
export function cleanAppCacheAndJunk(): CleanupResult {
  let tmpFilesRemoved = 0;
  let cachesPurged = 0;
  let junkFilesRemoved = 0;
  let bytesFreed = 0;
  const details: string[] = [];

  const targetDirs = [
    path.join(process.cwd(), ".data"),
    path.join(process.cwd(), "public", "uploads", "temp"),
    path.join(process.cwd(), "scratch"),
  ];

  // 1. Scan and remove orphaned .tmp and temporary files
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;

    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        try {
          const stat = fs.statSync(fullPath);

          // Clean .tmp atomic write remnants
          if (file.endsWith(".tmp") || file.includes(".tmp.") || file.startsWith("temp_")) {
            bytesFreed += stat.size;
            fs.unlinkSync(fullPath);
            tmpFilesRemoved++;
            details.push(`Removed temporary file: ${file}`);
            continue;
          }

          // Clean test artifacts or scratch scripts older than 2 hours
          if (dir.endsWith("scratch") && (file.startsWith("test_") || file.includes("test"))) {
            const ageMs = Date.now() - stat.mtimeMs;
            if (ageMs > 2 * 60 * 60 * 1000) {
              bytesFreed += stat.size;
              fs.unlinkSync(fullPath);
              junkFilesRemoved++;
              details.push(`Cleaned test artifact: ${file}`);
              continue;
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn(`[MaintenanceCleaner] Scan note for ${dir}:`, e);
    }
  }

  // 2. Clean expired rate limits & stale caches in .data/rate_limits.json
  try {
    const rateLimitsFile = path.join(process.cwd(), ".data", "rate_limits.json");
    if (fs.existsSync(rateLimitsFile)) {
      const raw = fs.readFileSync(rateLimitsFile, "utf-8");
      if (raw.trim()) {
        const data = JSON.parse(raw);
        if (typeof data === "object" && data !== null) {
          const now = Date.now();
          let cleaned = false;
          for (const key of Object.keys(data)) {
            // If item has resetTime or expiresAt in the past
            const item = data[key];
            if (item && item.resetTime && item.resetTime < now) {
              delete data[key];
              cleaned = true;
              cachesPurged++;
            }
          }
          if (cleaned) {
            fs.writeFileSync(rateLimitsFile, JSON.stringify(data, null, 2), "utf-8");
            details.push(`Purged ${cachesPurged} expired rate-limit cache entries`);
          }
        }
      }
    }
  } catch {}

  return {
    success: true,
    tmpFilesRemoved,
    cachesPurged,
    junkFilesRemoved,
    bytesFreed,
    timestamp: new Date().toISOString(),
    details,
  };
}
