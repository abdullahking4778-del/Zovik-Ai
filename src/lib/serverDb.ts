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
  try {
    const filePath = getStoragePath("shorts.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const rootPath = path.join(process.cwd(), "src", "data", "shorts.json");
    if (fs.existsSync(rootPath)) {
      const raw = fs.readFileSync(rootPath, "utf-8");
      return JSON.parse(raw || "[]");
    }
  } catch (err: unknown) {
    console.error("[ServerDb] Local shorts fallback error:", err);
  }

  return [];
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
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
  } catch {}
}

export async function deletePersistentShort(shortId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "shorts", shortId);
    await deleteDoc(docRef);
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore delete short failed:", err);
  }

  try {
    const filePath = getStoragePath("shorts.json");
    const existing = await getPersistentShorts();
    const updated = existing.filter((s) => s.id !== shortId);
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
  } catch {}

  return true;
}

// ============================================================================
// 2. CUSTOM CHARACTERS PERSISTENCE
// ============================================================================

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
    console.warn("[ServerDb] Firestore custom_characters read failed, using fallback:", err);
  }

  try {
    const filePath = getStoragePath("custom_characters.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw || "[]");
    }
  } catch {}

  return [];
}

export async function savePersistentCustomCharacter(character: Character): Promise<Character> {
  const charId = character.id || generateUniqueId("char");
  const charWithId: Character = { ...character, id: charId };

  try {
    const docRef = doc(db, "custom_characters", charId);
    await setDoc(docRef, charWithId);
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore save custom_character failed:", err);
  }

  try {
    const filePath = getStoragePath("custom_characters.json");
    const existing = await getPersistentCustomCharacters();
    const updated = [charWithId, ...existing.filter((c) => c.id !== charId)];
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
  } catch {}

  return charWithId;
}

export async function deletePersistentCustomCharacter(characterId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "custom_characters", characterId);
    await deleteDoc(docRef);
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore delete custom_character failed:", err);
  }

  try {
    const filePath = getStoragePath("custom_characters.json");
    const existing = await getPersistentCustomCharacters();
    const updated = existing.filter((c) => c.id !== characterId);
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
  } catch {}

  return true;
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

  try {
    const filePath = getStoragePath("payment_requests.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const list = JSON.parse(raw || "[]");
      if (Array.isArray(list)) return list;
    }
    const rootPath = path.join(process.cwd(), "src", "data", "payment_requests.json");
    if (fs.existsSync(rootPath)) {
      const raw = fs.readFileSync(rootPath, "utf-8");
      return JSON.parse(raw || "[]");
    }
  } catch {}

  return [];
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
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
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
      fs.writeFileSync(filePath, JSON.stringify(payments, null, 2), "utf-8");
      return target;
    }
  } catch {}

  return null;
}
