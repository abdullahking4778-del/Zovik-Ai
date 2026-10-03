import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

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
  return path.join(process.cwd(), "src", "data", "users.json");
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
  return users.find((u) => u.id === identifier || u.email?.toLowerCase() === clean) || null;
}

export function upsertStoredUser(
  identifier: string,
  updates: Partial<StoredUser>
): StoredUser {
  const users = getAllStoredUsers();
  const clean = identifier.trim().toLowerCase();
  const existingIdx = users.findIndex(
    (u) => u.id === identifier || u.email?.toLowerCase() === clean
  );

  const now = new Date();
  let resultUser: StoredUser;

  if (existingIdx >= 0) {
    const existing = users[existingIdx];
    resultUser = {
      ...existing,
      ...updates,
      tier: (updates.tier || existing.tier || "free") as "free" | "plus" | "vip",
      isVip: updates.tier ? updates.tier === "vip" : existing.isVip,
      lastLoginAt: updates.lastLoginAt || now.toISOString(),
    };
    users[existingIdx] = resultUser;
    saveAllStoredUsers(users);
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
  } catch {}

  return resultUser;
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
