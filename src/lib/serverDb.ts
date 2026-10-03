import { db } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ShortReel, Character, PaymentRequest } from "@/types";

/**
 * Server-Side Persistent Database Layer
 * Primary: Firebase Firestore (100% Free, Zero Card, Works permanently on Vercel Serverless)
 * Secondary: Local JSON Fallback / Initial Seed Cache
 */

// Helper: Safe path resolver for serverless environments
function getStoragePath(fileName: string): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", fileName);
  }
  return path.join(process.cwd(), "src", "data", fileName);
}

// Helper: Safe cryptographic ID generator
export function generateUniqueId(prefix: string = "id"): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

// Helper: Safe atomic write to prevent race conditions & corrupted JSON
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

// Helper: Safe read with non-empty checks to prevent JSON parse errors
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

// ============================================================================
// 1. SHORTS & REELS PERSISTENCE
// ============================================================================

export async function getPersistentShorts(): Promise<ShortReel[]> {
  // 1. Try reading from Firestore
  try {
    const colRef = collection(db, "shorts");
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: ShortReel[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<ShortReel, "id">) });
      });
      return items;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[ServerDb] Firestore shorts read failed, using fallback:", message);
  }

  // 2. Fallback to local seed file
  const storagePath = getStoragePath("shorts.json");
  const localList = safeReadJsonFile<ShortReel[]>(storagePath, []);
  if (localList.length > 0) return localList;

  const rootPath = path.join(process.cwd(), "src", "data", "shorts.json");
  return safeReadJsonFile<ShortReel[]>(rootPath, []);
}

export async function savePersistentShort(short: ShortReel): Promise<void> {
  const shortId = short.id || generateUniqueId("short");
  const shortWithId: ShortReel = { ...short, id: shortId };

  // 1. Save to Firestore
  try {
    const docRef = doc(db, "shorts", shortId);
    await setDoc(docRef, shortWithId);
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore save short failed, saving to local fallback:", err);
  }

  // 2. Also sync to local cache
  try {
    const filePath = getStoragePath("shorts.json");
    const existing = await getPersistentShorts();
    const updated = [shortWithId, ...existing.filter((s) => s.id !== shortId)];
    safeWriteJsonFile(filePath, updated);
  } catch {}
}

export async function deletePersistentShort(shortId: string): Promise<boolean> {
  // 1. Delete from Firestore
  try {
    const docRef = doc(db, "shorts", shortId);
    await deleteDoc(docRef);
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore delete short note:", err);
  }

  // 2. Delete from temporary/serverless storage
  try {
    const filePath = getStoragePath("shorts.json");
    const list = safeReadJsonFile<ShortReel[]>(filePath, []);
    if (Array.isArray(list) && list.length > 0) {
      const filtered = list.filter((s) => s.id !== shortId);
      safeWriteJsonFile(filePath, filtered);
    }
  } catch {}

  // 3. Delete from root seed data (for local dev)
  try {
    const rootPath = path.join(process.cwd(), "src", "data", "shorts.json");
    const list = safeReadJsonFile<ShortReel[]>(rootPath, []);
    if (Array.isArray(list) && list.length > 0) {
      const filtered = list.filter((s) => s.id !== shortId);
      safeWriteJsonFile(rootPath, filtered);
    }
  } catch {}

  return true;
}

// ============================================================================
// 2. CHARACTERS PERSISTENCE (CUSTOM, EDITED, & DELETED REGISTRY)
// ============================================================================

export async function getPersistentDeletedCharacterIds(): Promise<string[]> {
  const deletedSet = new Set<string>();

  // 1. Check Firestore
  try {
    const colRef = collection(db, "deleted_characters");
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      snapshot.forEach((d) => {
        deletedSet.add(d.id.toLowerCase());
        const data = d.data();
        if (data?.slug) deletedSet.add(String(data.slug).toLowerCase());
      });
    }
  } catch (err: unknown) {
    // Firestore offline fallback
  }

  // 2. Check local fallback file
  try {
    const filePath = getStoragePath("deleted_characters.json");
    const local = safeReadJsonFile<string[]>(filePath, []);
    local.forEach((id) => deletedSet.add(id.toLowerCase()));
  } catch {}

  return Array.from(deletedSet);
}

export async function recordPersistentDeletedCharacterId(id: string, slug?: string): Promise<void> {
  const cleanId = id.trim().toLowerCase();
  const cleanSlug = slug ? slug.trim().toLowerCase() : undefined;

  // 1. Save to Firestore
  try {
    const docRef = doc(db, "deleted_characters", cleanId);
    await setDoc(docRef, { id: cleanId, slug: cleanSlug, deletedAt: new Date().toISOString() });
    if (cleanSlug && cleanSlug !== cleanId) {
      const slugDocRef = doc(db, "deleted_characters", cleanSlug);
      await setDoc(slugDocRef, { id: cleanId, slug: cleanSlug, deletedAt: new Date().toISOString() });
    }
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore save deleted character note:", err);
  }

  // 2. Save to local fallback
  try {
    const filePath = getStoragePath("deleted_characters.json");
    const existing = safeReadJsonFile<string[]>(filePath, []);
    const updated = Array.from(new Set([...existing, cleanId, ...(cleanSlug ? [cleanSlug] : [])]));
    safeWriteJsonFile(filePath, updated);
  } catch {}
}

export async function getPersistentCustomCharacters(): Promise<Character[]> {
  try {
    const colRef = collection(db, "custom_characters");
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: Character[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<Character, "id">) });
      });
      return items;
    }
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore custom_characters read note:", err);
  }

  const filePath = getStoragePath("custom_characters.json");
  return safeReadJsonFile<Character[]>(filePath, []);
}

export async function savePersistentCustomCharacter(character: Character): Promise<Character> {
  const charId = character.id || generateUniqueId("char");
  const charWithId: Character = { ...character, id: charId };

  try {
    const docRef = doc(db, "custom_characters", charId);
    await setDoc(docRef, charWithId);
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore save custom_character note:", err);
  }

  try {
    const filePath = getStoragePath("custom_characters.json");
    const existing = await getPersistentCustomCharacters();
    const updated = [charWithId, ...existing.filter((c) => c.id !== charId)];
    safeWriteJsonFile(filePath, updated);
  } catch {}

  // If it exists in root characters.json, also sync updates to keep local seed updated
  try {
    const rootPath = path.join(process.cwd(), "src", "data", "characters.json");
    const list = safeReadJsonFile<Character[]>(rootPath, []);
    if (Array.isArray(list) && list.some((c) => c.id === charId || c.slug === charWithId.slug)) {
      const updatedList = list.map((c) => (c.id === charId || c.slug === charWithId.slug ? { ...c, ...charWithId } : c));
      safeWriteJsonFile(rootPath, updatedList);
    }
  } catch {}

  return charWithId;
}

export async function deletePersistentCharacter(characterId: string): Promise<boolean> {
  const cleanId = characterId.trim();

  // 1. Delete from Firestore custom_characters
  try {
    const docRef = doc(db, "custom_characters", cleanId);
    await deleteDoc(docRef);
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore delete custom_character note:", err);
  }

  // 2. Delete from custom_characters.json
  try {
    const filePath = getStoragePath("custom_characters.json");
    const existing = await getPersistentCustomCharacters();
    const updated = existing.filter((c) => c.id !== cleanId && c.slug !== cleanId);
    safeWriteJsonFile(filePath, updated);
  } catch {}

  // 3. Delete from root characters.json (so local seed never resurrects it)
  try {
    const rootPath = path.join(process.cwd(), "src", "data", "characters.json");
    const list = safeReadJsonFile<Character[]>(rootPath, []);
    if (Array.isArray(list) && list.length > 0) {
      const filtered = list.filter((c) => c.id !== cleanId && c.slug !== cleanId);
      if (filtered.length !== list.length) {
        safeWriteJsonFile(rootPath, filtered);
      }
    }
  } catch (err: unknown) {
    console.warn("[ServerDb] Error pruning character from characters.json:", err);
  }

  // 4. Record in deleted characters registry
  await recordPersistentDeletedCharacterId(cleanId);

  return true;
}

// Backward-compatible alias
export const deletePersistentCustomCharacter = deletePersistentCharacter;

export async function getAllPersistentCharacters(): Promise<Character[]> {
  const [customChars, deletedIds] = await Promise.all([
    getPersistentCustomCharacters(),
    getPersistentDeletedCharacterIds(),
  ]);

  const rootPath = path.join(process.cwd(), "src", "data", "characters.json");
  const defaultChars = safeReadJsonFile<Character[]>(rootPath, []);

  // Map of characters by id (custom overrides default)
  const charMap = new Map<string, Character>();

  // Add default characters first (if not deleted)
  for (const c of defaultChars) {
    const isDeleted = deletedIds.includes(c.id.toLowerCase()) || (c.slug && deletedIds.includes(c.slug.toLowerCase()));
    if (!isDeleted) {
      charMap.set(c.id, c);
    }
  }

  // Overlay custom characters (if not deleted)
  for (const c of customChars) {
    const isDeleted = deletedIds.includes(c.id.toLowerCase()) || (c.slug && deletedIds.includes(c.slug.toLowerCase()));
    if (!isDeleted) {
      charMap.set(c.id, c);
    }
  }

  return Array.from(charMap.values());
}

// ============================================================================
// 3. PAYMENT REQUESTS (SUBSCRIPTIONS) PERSISTENCE
// ============================================================================

export async function getPersistentPayments(): Promise<PaymentRequest[]> {
  try {
    const colRef = collection(db, "payment_requests");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: PaymentRequest[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<PaymentRequest, "id">) });
      });
      return items;
    }
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore payment_requests read note:", err);
  }

  const storagePath = getStoragePath("payment_requests.json");
  const localList = safeReadJsonFile<PaymentRequest[]>(storagePath, []);
  if (localList.length > 0) return localList;

  const rootPath = path.join(process.cwd(), "src", "data", "payment_requests.json");
  return safeReadJsonFile<PaymentRequest[]>(rootPath, []);
}

export async function savePersistentPayment(payment: PaymentRequest): Promise<PaymentRequest> {
  const payId = payment.id || generateUniqueId("pay");
  const paymentWithId: PaymentRequest = { ...payment, id: payId };

  try {
    const docRef = doc(db, "payment_requests", payId);
    await setDoc(docRef, paymentWithId);
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore save payment note:", err);
  }

  try {
    const filePath = getStoragePath("payment_requests.json");
    const existing = await getPersistentPayments();
    const updated = [paymentWithId, ...existing.filter((p) => p.id !== payId)];
    safeWriteJsonFile(filePath, updated);
  } catch {}

  return paymentWithId;
}

export async function updatePersistentPaymentStatus(
  paymentId: string,
  action: "approve" | "reject"
): Promise<PaymentRequest | null> {
  const now = new Date().toISOString();
  const status: "approved" | "rejected" = action === "approve" ? "approved" : "rejected";

  try {
    const docRef = doc(db, "payment_requests", paymentId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const current = snap.data() as PaymentRequest;
      const updates = {
        status,
        ...(action === "approve" ? { approvedAt: now } : { rejectedAt: now }),
      };
      await updateDoc(docRef, updates);
      return { ...current, ...updates, id: paymentId };
    }
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore update payment note:", err);
  }

  try {
    const payments = await getPersistentPayments();
    const target = payments.find((p) => p.id === paymentId);
    if (target) {
      target.status = status;
      if (action === "approve") {
        target.approvedAt = now;
      } else {
        target.rejectedAt = now;
      }
      const filePath = getStoragePath("payment_requests.json");
      safeWriteJsonFile(filePath, payments);
      return target;
    }
  } catch {}

  return null;
}
