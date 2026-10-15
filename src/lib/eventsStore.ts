import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";
import { adminDb } from "./firebaseAdmin";
import { AppEvent, EventStatus, EventVisibility, EventType } from "@/types";

function getEventsStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_events.json");
  }
  return path.join(process.cwd(), ".data", "events.json");
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
 * Seed initial events so admin has immediate examples to toggle or modify
 */
const DEFAULT_EVENTS: AppEvent[] = [
  {
    id: "evt_weekend_flash_2025",
    title: "🔥 Weekend Flash Festival",
    subtitle: "Double Coins + 50% Off VIP Subscriptions",
    description: "Enjoy 2x daily messages, unlocked exclusive photos, and instant bonus coins all weekend long!",
    type: "weekly",
    status: "live",
    badge: "WEEKEND PASS ⚡",
    bannerUrl: "/characters/zovik_01.jpg",
    themeColor: "#f53b70",
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    actionType: "open_premium",
    actionTarget: "vip",
    actionText: "Claim 50% Deal",
    visibility: "all",
    priority: 10,
    isActive: true,
    discountPercent: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt_ramadan_special_2025",
    title: "🌙 Grand Seasonal Companion Drop",
    subtitle: "New Limited Characters & Free Voice Notes",
    description: "Exclusive limited-time companions available for chat with custom seasonal voice lines and greetings.",
    type: "seasonal",
    status: "scheduled",
    badge: "SPECIAL DROP 🌟",
    bannerUrl: "/characters/zovik_02.jpg",
    themeColor: "#8b5cf6",
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    actionType: "open_link",
    actionTarget: "/characters",
    actionText: "Explore Drop",
    visibility: "all",
    priority: 8,
    isActive: true,
    discountPercent: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Computes event dynamic status based on start/end dates and manual active toggle
 */
export function computeEventStatus(event: AppEvent, now: Date = new Date()): EventStatus {
  if (!event.isActive) return "draft";
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  const current = now.getTime();

  if (current < start) return "scheduled";
  if (current >= start && current <= end) return "live";
  return "ended";
}

let inMemoryEventsCache: AppEvent[] | null = null;
let lastEventsFetchTime = 0;

/**
 * Fetch all persistent events for Admin.
 * Resolves Supabase -> Firebase -> Local File.
 */
export async function getPersistentEvents(): Promise<AppEvent[]> {
  const now = Date.now();
  if (inMemoryEventsCache && now - lastEventsFetchTime < 10000) {
    return inMemoryEventsCache.map((e) => ({
      ...e,
      status: computeEventStatus(e),
    }));
  }

  // 1. Supabase Check
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "app_events")
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value)) {
        const events = (data.value as AppEvent[]).map((e) => ({
          ...e,
          status: computeEventStatus(e),
        }));
        inMemoryEventsCache = events;
        lastEventsFetchTime = now;
        safeWriteJsonFile(getEventsStoragePath(), events);
        return events;
      }
    } catch (err) {
      console.warn("[EventsStore] Supabase events read note:", err);
    }
  }

  // 2. Firebase Admin Check
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docSnap = await adminDb.collection("config").doc("events").get();
      if (docSnap.exists) {
        const d = docSnap.data();
        if (d && Array.isArray(d.items)) {
          const events = (d.items as AppEvent[]).map((e) => ({
            ...e,
            status: computeEventStatus(e),
          }));
          inMemoryEventsCache = events;
          lastEventsFetchTime = now;
          safeWriteJsonFile(getEventsStoragePath(), events);
          return events;
        }
      }
    }
  } catch (err) {
    console.warn("[EventsStore] Firestore events read note:", err);
  }

  // 3. Local/tmp JSON Fallback
  const localList = safeReadJsonFile<AppEvent[]>(getEventsStoragePath(), DEFAULT_EVENTS);
  const events = localList.map((e) => ({
    ...e,
    status: computeEventStatus(e),
  }));
  inMemoryEventsCache = events;
  lastEventsFetchTime = now;
  return events;
}

/**
 * Get public active events (Only 'live' events, sorted by priority)
 */
export async function getActivePublicEvents(userTier: "free" | "plus" | "vip" = "free"): Promise<AppEvent[]> {
  const allEvents = await getPersistentEvents();
  return allEvents
    .filter((e) => {
      if (e.status !== "live" || !e.isActive) return false;
      if (e.visibility === "all") return true;
      if (e.visibility === "premium" && (userTier === "plus" || userTier === "vip")) return true;
      if (e.visibility === "free" && userTier === "free") return true;
      return false;
    })
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Save or update an event.
 */
export async function savePersistentEvent(input: Partial<AppEvent>): Promise<AppEvent> {
  const existing = await getPersistentEvents();
  const id = (input.id || `evt_${crypto.randomUUID().slice(0, 8)}`).trim();
  const nowStr = new Date().toISOString();

  const eventToSave: AppEvent = {
    id,
    title: input.title?.trim() || "Special Event",
    subtitle: input.subtitle?.trim() || "",
    description: input.description?.trim() || "",
    type: (input.type || "special") as EventType,
    status: "draft", // will be computed dynamically
    badge: input.badge?.trim() || "EVENT",
    bannerUrl: input.bannerUrl?.trim() || "",
    themeColor: input.themeColor || "#f53b70",
    startDate: input.startDate || nowStr,
    endDate: input.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    actionType: input.actionType || "open_premium",
    actionTarget: input.actionTarget?.trim() || "",
    actionText: input.actionText?.trim() || "View Details",
    visibility: (input.visibility || "all") as EventVisibility,
    priority: Number(input.priority) || 1,
    isActive: input.isActive !== false,
    linkedCharacterIds: Array.isArray(input.linkedCharacterIds) ? input.linkedCharacterIds : [],
    discountPercent: input.discountPercent ? Number(input.discountPercent) : undefined,
    createdAt: input.createdAt || nowStr,
    updatedAt: nowStr,
  };

  eventToSave.status = computeEventStatus(eventToSave);

  const idx = existing.findIndex((e) => e.id === id);
  let updatedList: AppEvent[];
  if (idx >= 0) {
    updatedList = [...existing];
    updatedList[idx] = eventToSave;
  } else {
    updatedList = [eventToSave, ...existing];
  }

  inMemoryEventsCache = updatedList;
  lastEventsFetchTime = Date.now();
  safeWriteJsonFile(getEventsStoragePath(), updatedList);

  // Sync to Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("app_settings").upsert({
        key: "app_events",
        value: updatedList,
        updated_at: nowStr,
      });
    } catch (err) {
      console.warn("[EventsStore] Supabase save note:", err);
    }
  }

  // Sync to Firebase
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("events").set({
        items: updatedList,
        updatedAt: nowStr,
      });
    }
  } catch (err) {
    console.warn("[EventsStore] Firestore save note:", err);
  }

  return eventToSave;
}

/**
 * Delete an event by ID.
 */
export async function deletePersistentEvent(id: string): Promise<boolean> {
  const existing = await getPersistentEvents();
  const filtered = existing.filter((e) => e.id !== id);

  inMemoryEventsCache = filtered;
  lastEventsFetchTime = Date.now();
  safeWriteJsonFile(getEventsStoragePath(), filtered);

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("app_settings").upsert({
        key: "app_events",
        value: filtered,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[EventsStore] Supabase delete note:", err);
    }
  }

  try {
    if (adminDb && typeof adminDb.collection === "function") {
      await adminDb.collection("config").doc("events").set({
        items: filtered,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("[EventsStore] Firestore delete note:", err);
  }

  return true;
}
