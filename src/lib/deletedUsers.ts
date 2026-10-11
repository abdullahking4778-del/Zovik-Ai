import fs from "fs";
import path from "path";
import { adminDb } from "./firebaseAdmin";
import type { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

export interface DeletedUserRecord {
  id?: string;
  email?: string;
  deletedAt: string;
  reason?: string;
}

// In-memory cache for fast lookups
let inMemoryTombstones: DeletedUserRecord[] = [];
let lastCloudFetchTime = 0;

function getDeletedUsersPath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_deleted_users.json");
  }
  const dir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "deleted_users.json");
}

function readLocalDeletedUsers(): DeletedUserRecord[] {
  try {
    const file = getDeletedUsersPath();
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as DeletedUserRecord[];
  } catch {
    return [];
  }
}

function writeLocalDeletedUsers(records: DeletedUserRecord[]): void {
  try {
    const file = getDeletedUsersPath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.warn("[DeletedUsers] Local cache write notice:", err);
  }
}

// Initialize memory cache from local file
try {
  inMemoryTombstones = readLocalDeletedUsers();
} catch {}

/**
 * Fetch tombstones from authoritative cloud stores (Firestore / Supabase)
 */
async function syncFromCloudStore(): Promise<void> {
  const now = Date.now();
  if (now - lastCloudFetchTime < 30000 && inMemoryTombstones.length > 0) {
    return;
  }

  // 1. Fetch from Firestore (via Firebase Admin SDK)
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const snapshot = await adminDb.collection("deleted_users").get();
      if (!snapshot.empty) {
        const cloudRecords: DeletedUserRecord[] = [];
        snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data() as Partial<DeletedUserRecord>;
          cloudRecords.push({
            id: (data.id as string) || doc.id,
            email: data.email as string | undefined,
            deletedAt: (data.deletedAt as string) || new Date().toISOString(),
            reason: (data.reason as string) || "admin_deletion",
          });
        });

        // Merge with memory tombstones
        const mergedMap = new Map<string, DeletedUserRecord>();
        [...inMemoryTombstones, ...cloudRecords].forEach((rec) => {
          const key = (rec.id || rec.email || "").toLowerCase();
          if (key) mergedMap.set(key, rec);
        });
        inMemoryTombstones = Array.from(mergedMap.values());
        writeLocalDeletedUsers(inMemoryTombstones);
        lastCloudFetchTime = now;
        return;
      }
    }
  } catch (err) {
    // Graceful fallback to local cache
    console.warn("[DeletedUsers] Cloud Firestore tombstone read notice:", err);
  }

  // 2. Fetch from Supabase (if configured)
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("deleted_users")
        .select("id, email, deleted_at, reason");
      if (!error && Array.isArray(data)) {
        data.forEach((row: { id?: string; email?: string; deleted_at?: string; reason?: string }) => {
          inMemoryTombstones.push({
            id: row.id,
            email: row.email,
            deletedAt: row.deleted_at || new Date().toISOString(),
            reason: row.reason,
          });
        });
        lastCloudFetchTime = now;
      }
    } catch {}
  }
}

/**
 * Permanently records a user UID / Email as deleted by administrator in authoritative storage.
 * Returns operation result.
 */
export async function recordDeletedUser(
  id: string,
  email?: string,
  reason: string = "admin_deletion"
): Promise<{ success: boolean; persistent: boolean; error?: string }> {
  const cleanId = (id || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanId && !cleanEmail) {
    return { success: false, persistent: false, error: "Missing identifier" };
  }

  const record: DeletedUserRecord = {
    id: cleanId || undefined,
    email: cleanEmail || undefined,
    deletedAt: new Date().toISOString(),
    reason,
  };

  // 1. Update memory & local file
  inMemoryTombstones = inMemoryTombstones.filter(
    (u) =>
      (!cleanId || u.id !== cleanId) &&
      (!cleanEmail || u.email?.toLowerCase() !== cleanEmail)
  );
  inMemoryTombstones.push(record);
  writeLocalDeletedUsers(inMemoryTombstones);

  let cloudSaved = false;
  let cloudError: string | undefined;

  // 2. Authoritative save to Cloud Firestore via Firebase Admin SDK
  try {
    if (adminDb && typeof adminDb.collection === "function") {
      const docKey = cleanId || cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
      await adminDb.collection("deleted_users").doc(docKey).set({
        id: cleanId || null,
        email: cleanEmail || null,
        deletedAt: record.deletedAt,
        reason: record.reason,
      });
      cloudSaved = true;
    }
  } catch (err) {
    cloudError = err instanceof Error ? err.message : String(err);
    console.warn("[DeletedUsers] Firestore tombstone write warning:", err);
  }

  // 3. Save to Supabase (if configured)
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseAdmin.from("deleted_users").upsert({
        id: cleanId || cleanEmail,
        email: cleanEmail || null,
        deleted_at: record.deletedAt,
        reason: record.reason,
      });
      if (!error) {
        cloudSaved = true;
      }
    } catch {}
  }

  return {
    success: true,
    persistent: cloudSaved,
    error: cloudError,
  };
}

/**
 * Checks if a user has been deleted by administrator.
 */
export function isUserDeleted(id?: string, email?: string): boolean {
  const cleanId = (id || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanId && !cleanEmail) return false;

  // Fast synchronous check against cached state
  const isBlocked = inMemoryTombstones.some(
    (u) =>
      (cleanId && u.id && u.id === cleanId) ||
      (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
  );

  if (isBlocked) return true;

  // Trigger background cloud refresh if cache might be stale
  if (Date.now() - lastCloudFetchTime > 30000) {
    syncFromCloudStore().catch(() => {});
  }

  return false;
}

/**
 * Async authoritative check against both cache and cloud storage.
 * On cold start or stale cache, awaits cloud sync before authenticating.
 */
export async function isUserDeletedAsync(id?: string, email?: string): Promise<boolean> {
  if (isUserDeleted(id, email)) return true;

  if (lastCloudFetchTime === 0 || Date.now() - lastCloudFetchTime > 30000) {
    try {
      await Promise.race([
        syncFromCloudStore(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Cloud tombstone sync timeout")), 1500)
        ),
      ]);
    } catch (syncErr) {
      console.warn("[DeletedUsers] Cold-start cloud sync notice:", syncErr);
    }
  }

  return isUserDeleted(id, email);
}

/**
 * Unmarks a tombstone ONLY upon authorized administrator action.
 */
export async function removeDeletedUserTombstone(
  id?: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  const cleanId = (id || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanId && !cleanEmail) return { success: false, error: "Missing identifier" };

  let cloudError: string | undefined;
  let cloudSuccess = true;

  // 1. Remove from Firestore if configured
  if (adminDb && typeof adminDb.collection === "function") {
    try {
      const docKey = cleanId || cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
      await adminDb.collection("deleted_users").doc(docKey).delete();
    } catch (err) {
      cloudError = err instanceof Error ? err.message : String(err);
      cloudSuccess = false;
      console.warn("[DeletedUsers] Firestore tombstone removal note:", err);
    }
  }

  // 2. Remove from Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      if (cleanId) {
        const { error: err1 } = await supabaseAdmin.from("deleted_users").delete().eq("id", cleanId);
        if (err1) cloudSuccess = false;
      }
      if (cleanEmail) {
        const { error: err2 } = await supabaseAdmin.from("deleted_users").delete().eq("email", cleanEmail);
        if (err2) cloudSuccess = false;
      }
    } catch {
      cloudSuccess = false;
    }
  }

  // If cloud storage was configured and authoritative deletion failed, DO NOT mutate local state into inconsistency!
  if (!cloudSuccess && (adminDb || isSupabaseConfigured())) {
    return { success: false, error: cloudError || "Failed to remove tombstone from authoritative cloud storage" };
  }

  // 3. Remove from in-memory cache and local file ONLY after authoritative removal
  inMemoryTombstones = inMemoryTombstones.filter(
    (u) =>
      (!cleanId || u.id !== cleanId) &&
      (!cleanEmail || u.email?.toLowerCase() !== cleanEmail)
  );
  writeLocalDeletedUsers(inMemoryTombstones);

  return { success: true };
}
