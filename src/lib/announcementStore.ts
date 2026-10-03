import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AnnouncementConfig } from "@/types";

const DEFAULT_ANNOUNCEMENT: AnnouncementConfig = {
  enabled: true,
  text: "🎉 FLASH DEAL: VIP Elite Plan 50% Off — Only Rs. 400 for Today! Tap here to Unlock 18+ Uncensored Chat 💕",
  badge: "FLASH DEAL 🔥",
  actionType: "open_premium",
  updatedAt: new Date().toISOString(),
};

function getAnnouncementStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_announcement.json");
  }
  return path.join(process.cwd(), "src", "data", "announcement.json");
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

export function getPersistentAnnouncement(): AnnouncementConfig {
  const filePath = getAnnouncementStoragePath();
  const config = safeReadJsonFile<AnnouncementConfig>(filePath, DEFAULT_ANNOUNCEMENT);
  return config;
}

export function savePersistentAnnouncement(update: Partial<AnnouncementConfig>): AnnouncementConfig {
  const current = getPersistentAnnouncement();
  const updated: AnnouncementConfig = {
    ...current,
    ...update,
    updatedAt: new Date().toISOString(),
  };

  const filePath = getAnnouncementStoragePath();
  safeWriteJsonFile(filePath, updated);

  const fallbackPath = path.join(process.cwd(), "src", "data", "announcement.json");
  if (filePath !== fallbackPath) {
    safeWriteJsonFile(fallbackPath, updated);
  }

  return updated;
}
