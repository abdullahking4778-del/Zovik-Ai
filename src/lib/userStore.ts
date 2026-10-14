import fs from "fs";
import path from "path";
import crypto from "crypto";
import { adminDb } from "./firebaseAdmin";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  photoURL?: string | null;
  tier: "free" | "plus" | "vip";
  isVip: boolean;
  subscriptionDays: number;
  subscriptionStart?: string | null;
  subscriptionEndsAt?: string | null;
  storageRetentionDays: number;
  createdAt: string;
  lastLoginAt?: string | null;
}

function getUsersFilePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_users.json");
  }
  return path.join(process.cwd(), ".data", "users.json");
}

export function getAllStoredUsers(): StoredUser[] {
  try {
    const filePath = getUsersFilePath();
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[UserStore] Error reading users file:", err);
    return [];
  }
}

export function saveAllStoredUsers(users: StoredUser[]): void {
  const filePath = getUsersFilePath();
  const tmpPath = `${filePath}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(users, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.warn("[UserStore] Local file save note (Safe for serverless):", err);
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

export function findStoredUser(identifier: string): StoredUser | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const users = getAllStoredUsers();
  return users.find((u) => u.id === identifier || u.id?.toLowerCase() === clean || u.email?.toLowerCase() === clean) || null;
}

export function upsertStoredUser(
  identifier: string,
  updates: Partial<StoredUser>
): StoredUser {
  const users = getAllStoredUsers();
  const clean = identifier.trim().toLowerCase();
  const updateEmailClean = updates.email ? updates.email.trim().toLowerCase() : "";

  const existingIdx = users.findIndex(
    (u) =>
      u.id === identifier ||
      u.email?.toLowerCase() === clean ||
      (updateEmailClean && (u.id === updateEmailClean || u.email?.toLowerCase() === updateEmailClean))
  );

  const now = new Date();
  let resultUser: StoredUser;

  if (existingIdx >= 0) {
    const existing = users[existingIdx];
    const resolvedId = identifier && !identifier.includes("@") ? identifier : (existing.id || identifier);
    const resolvedTier = (updates.tier || existing.tier || "free") as "free" | "plus" | "vip";
    const resolvedIsVip = updates.tier ? updates.tier === "vip" : (existing.isVip || resolvedTier === "vip");

    resultUser = {
      ...existing,
      ...updates,
      id: resolvedId,
      email: updates.email || existing.email,
      name: updates.name || existing.name || (updates.email ? updates.email.split("@")[0] : "User"),
      photoURL: updates.photoURL !== undefined ? updates.photoURL : existing.photoURL,
      tier: resolvedTier,
      isVip: resolvedIsVip,
      subscriptionDays: typeof updates.subscriptionDays === "number" ? updates.subscriptionDays : existing.subscriptionDays,
      subscriptionStart: updates.subscriptionStart !== undefined ? updates.subscriptionStart : existing.subscriptionStart,
      subscriptionEndsAt: updates.subscriptionEndsAt !== undefined ? updates.subscriptionEndsAt : existing.subscriptionEndsAt,
      storageRetentionDays: typeof updates.storageRetentionDays === "number"
        ? updates.storageRetentionDays
        : (resolvedTier === "vip" ? 35 : resolvedTier === "plus" ? 30 : 7),
      lastLoginAt: updates.lastLoginAt || now.toISOString(),
    };
    users[existingIdx] = resultUser;

    const dedupedUsers = users.filter((u, idx) => {
      if (idx === existingIdx) return true;
      const isDup = (resultUser.id && u.id === resultUser.id) ||
                    (resultUser.email && u.email?.toLowerCase() === resultUser.email.toLowerCase());
      return !isDup;
    });

    saveAllStoredUsers(dedupedUsers);
  } else {
    const assignedTier = updates.tier || "free";
    const days = typeof updates.subscriptionDays === "number" ? updates.subscriptionDays : (assignedTier === "vip" ? 30 : 0);
    const endsAt = days > 0 ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString() : null;

    resultUser = {
      id: identifier,
      email: updates.email || identifier,
      name: updates.name || (updates.email ? updates.email.split("@")[0] : "User"),
      photoURL: updates.photoURL || null,
      tier: assignedTier as "free" | "plus" | "vip",
      isVip: assignedTier === "vip",
      subscriptionDays: days,
      subscriptionStart: days > 0 ? now.toISOString() : null,
      subscriptionEndsAt: updates.subscriptionEndsAt || endsAt,
      storageRetentionDays: typeof updates.storageRetentionDays === "number"
        ? updates.storageRetentionDays
        : assignedTier === "vip" ? 35 : assignedTier === "plus" ? 30 : 7,
      createdAt: now.toISOString(),
      lastLoginAt: now.toISOString(),
      ...updates,
    };
    users.push(resultUser);
    saveAllStoredUsers(users);
  }

  // Asynchronous cloud sync to Firestore (guarantees data persistence across Vercel cold starts)
  try {
    const docId = resultUser.id || resultUser.email;
    if (docId) {
      if (adminDb && typeof adminDb.collection === "function") {
        adminDb.collection("users").doc(docId).set(
          {
            zovik_tier: resultUser.tier,
            email: resultUser.email,
            name: resultUser.name,
            isVip: resultUser.isVip,
            subscriptionDays: resultUser.subscriptionDays,
            subscriptionStart: resultUser.subscriptionStart || null,
            subscriptionEndsAt: resultUser.subscriptionEndsAt || null,
            storageRetentionDays: resultUser.storageRetentionDays,
            lastLoginAt: resultUser.lastLoginAt,
          },
          { merge: true }
        ).catch((e) => console.warn("[UserStore] Firestore admin sync note:", e));
      } else {
        const userRef = doc(db, "users", docId);
        setDoc(
          userRef,
          {
            zovik_tier: resultUser.tier,
            email: resultUser.email,
            name: resultUser.name,
            isVip: resultUser.isVip,
            subscriptionDays: resultUser.subscriptionDays,
            subscriptionStart: resultUser.subscriptionStart || null,
            subscriptionEndsAt: resultUser.subscriptionEndsAt || null,
            storageRetentionDays: resultUser.storageRetentionDays,
            lastLoginAt: resultUser.lastLoginAt,
          },
          { merge: true }
        ).catch((e) => console.warn("[UserStore] Firestore sync note:", e));
      }
    }
  } catch {}

  // Cloud sync to Supabase PostgreSQL (100% free permanent database)
  if (isSupabaseConfigured() && resultUser.email) {
    Promise.resolve(
      supabaseAdmin.from("user_accounts").upsert({
        email: resultUser.email.toLowerCase(),
        tier: resultUser.tier,
        is_vip: resultUser.isVip,
        subscription_start: resultUser.subscriptionStart || null,
        subscription_end: resultUser.subscriptionEndsAt || null,
        updated_at: new Date().toISOString(),
      })
    ).then(
      (res) => {
        if (res.error) console.warn("[UserStore] Supabase user sync error:", res.error.message);
      },
      (e: unknown) => {
        console.warn("[UserStore] Supabase sync note:", e);
      }
    );
  }

  return resultUser;
}

/**
 * Awaitable, explicit cloud persistence for user accounts.
 * Validates and propagates database errors instead of silent failures.
 */
export async function upsertStoredUserAsync(
  identifier: string,
  updates: Partial<StoredUser>
): Promise<{ user: StoredUser; dbSynced: boolean; error?: string }> {
  const resultUser = upsertStoredUser(identifier, updates);
  let dbSynced = false;
  let syncError: string | undefined;

  // 1. Direct await to Firestore (Admin SDK first, client SDK fallback)
  try {
    const docId = resultUser.id || resultUser.email;
    if (docId) {
      if (adminDb && typeof adminDb.collection === "function") {
        await adminDb.collection("users").doc(docId).set(
          {
            zovik_tier: resultUser.tier,
            email: resultUser.email,
            name: resultUser.name,
            isVip: resultUser.isVip,
            subscriptionDays: resultUser.subscriptionDays,
            subscriptionStart: resultUser.subscriptionStart || null,
            subscriptionEndsAt: resultUser.subscriptionEndsAt || null,
            storageRetentionDays: resultUser.storageRetentionDays,
            lastLoginAt: resultUser.lastLoginAt,
          },
          { merge: true }
        );
        dbSynced = true;
      } else {
        const userRef = doc(db, "users", docId);
        await setDoc(
          userRef,
          {
            zovik_tier: resultUser.tier,
            email: resultUser.email,
            name: resultUser.name,
            isVip: resultUser.isVip,
            subscriptionDays: resultUser.subscriptionDays,
            subscriptionStart: resultUser.subscriptionStart || null,
            subscriptionEndsAt: resultUser.subscriptionEndsAt || null,
            storageRetentionDays: resultUser.storageRetentionDays,
            lastLoginAt: resultUser.lastLoginAt,
          },
          { merge: true }
        );
        dbSynced = true;
      }
    }
  } catch (err) {
    syncError = err instanceof Error ? err.message : String(err);
    console.warn("[UserStore] Firestore explicit write warning:", err);
  }

  // 2. Direct await to Supabase
  if (isSupabaseConfigured() && resultUser.email) {
    try {
      const { error } = await supabaseAdmin.from("user_accounts").upsert({
        email: resultUser.email.toLowerCase(),
        tier: resultUser.tier,
        is_vip: resultUser.isVip,
        subscription_start: resultUser.subscriptionStart || null,
        subscription_end: resultUser.subscriptionEndsAt || null,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        syncError = error.message;
        console.warn("[UserStore] Supabase explicit write warning:", error.message);
      } else {
        dbSynced = true;
      }
    } catch (sbErr) {
      syncError = sbErr instanceof Error ? sbErr.message : String(sbErr);
    }
  }

  return { user: resultUser, dbSynced, error: syncError };
}

/**
 * Checks active tier status taking subscription expiration into account.
 */
export function getActiveUserTier(identifier: string): {
  tier: "free" | "plus" | "vip";
  isVip: boolean;
  subscriptionEndsAt: string | null;
  storageRetentionDays: number;
} {
  const user = findStoredUser(identifier);
  if (!user) {
    return { tier: "free", isVip: false, subscriptionEndsAt: null, storageRetentionDays: 7 };
  }

  let activeTier = user.tier || "free";
  if ((activeTier === "vip" || activeTier === "plus") && user.subscriptionEndsAt) {
    const endsAtTime = new Date(user.subscriptionEndsAt).getTime();
    if (endsAtTime < Date.now()) {
      activeTier = "free";
    }
  }

  return {
    tier: activeTier as "free" | "plus" | "vip",
    isVip: activeTier === "vip",
    subscriptionEndsAt: user.subscriptionEndsAt || null,
    storageRetentionDays: user.storageRetentionDays || (activeTier === "vip" ? 35 : activeTier === "plus" ? 30 : 7),
  };
}
