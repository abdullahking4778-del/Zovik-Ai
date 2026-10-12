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
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ShortReel, Character, PaymentRequest } from "@/types";

/**
 * Server-Side Persistent Database Layer
 * Primary: Supabase PostgreSQL (100% Free Forever, 0 PKR, No Card, Durable on Vercel)
 * Secondary: Firebase Firestore (Backup / Dual-Sync)
 * Tertiary: Local JSON Fallback / Seed Cache
 */

// Helper: Safe path resolver for serverless environments
function getStoragePath(fileName: string): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", fileName);
  }
  const dotDataPath = path.join(process.cwd(), ".data", fileName);
  if (fs.existsSync(dotDataPath)) return dotDataPath;
  const srcDataPath = path.join(process.cwd(), "src", "data", fileName);
  if (fs.existsSync(srcDataPath)) return srcDataPath;
  return dotDataPath;
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
  // 1. Primary: Try reading from Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("shorts_reels")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          characterId: d.character_id || "general",
          characterName: d.title || "Companion Reel",
          characterAge: 22,
          avatar: "/characters/zovik_01.jpg",
          videoUrl: d.video_url,
          caption: d.title,
          tags: ["Trending", "HD"],
          likes: d.likes ?? 0,
          createdAt: d.created_at,
        }));
      }
    } catch (err: unknown) {
      console.warn("[ServerDb] Supabase shorts read note:", err);
    }
  }

  // 2. Secondary: Try reading from Firestore
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

  // 3. Fallback to local seed file
  const storagePath = getStoragePath("shorts.json");
  const localList = safeReadJsonFile<ShortReel[]>(storagePath, []);
  if (localList.length > 0) return localList;

  const rootPath = path.join(process.cwd(), ".data", "shorts.json");
  return safeReadJsonFile<ShortReel[]>(rootPath, []);
}

export async function savePersistentShort(short: ShortReel): Promise<void> {
  const shortId = short.id || generateUniqueId("short");
  const shortWithId: ShortReel = { ...short, id: shortId };

  // 1. Primary: Save to Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseAdmin.from("shorts_reels").upsert({
        id: shortId,
        title: shortWithId.caption || shortWithId.characterName || "Reel",
        video_url: shortWithId.videoUrl,
        character_id: shortWithId.characterId || null,
        likes: shortWithId.likes || 0,
        created_at: shortWithId.createdAt || new Date().toISOString(),
      });
      if (error) {
        console.warn("[ServerDb] Supabase save short error:", error.message || error);
      }
    } catch (err: unknown) {
      console.warn("[ServerDb] Supabase save short note:", err);
    }
  }

  // 2. Secondary: Save to Firestore
  try {
    const docRef = doc(db, "shorts", shortId);
    await setDoc(docRef, shortWithId);
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore save short note:", err);
  }

  // 3. Sync to local cache
  try {
    const filePath = getStoragePath("shorts.json");
    const existing = await getPersistentShorts();
    const updated = [shortWithId, ...existing.filter((s) => s.id !== shortId)];
    safeWriteJsonFile(filePath, updated);
  } catch {}
}

export async function deletePersistentShort(shortId: string): Promise<boolean> {
  // 1. Primary: Delete from Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseAdmin.from("shorts_reels").delete().eq("id", shortId);
      if (error) {
        console.warn("[ServerDb] Supabase delete short error:", error.message || error);
      }
    } catch (err: unknown) {
      console.warn("[ServerDb] Supabase delete short note:", err);
    }
  }

  // 2. Secondary: Delete from Firestore
  try {
    const docRef = doc(db, "shorts", shortId);
    await deleteDoc(docRef);
  } catch (err: unknown) {
    console.warn("[ServerDb] Firestore delete short note:", err);
  }

  // 3. Delete from temporary/serverless storage
  try {
    const filePath = getStoragePath("shorts.json");
    const list = safeReadJsonFile<ShortReel[]>(filePath, []);
    if (Array.isArray(list) && list.length > 0) {
      const filtered = list.filter((s) => s.id !== shortId);
      safeWriteJsonFile(filePath, filtered);
    }
  } catch {}

  // 4. Delete from root seed data (for local dev)
  try {
    const rootPath = path.join(process.cwd(), ".data", "shorts.json");
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
  } catch {}

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

  // 1. Delete directly from Supabase companions table
  if (isSupabaseConfigured()) {
    try {
      const { error: err1 } = await supabaseAdmin.from("companions").delete().eq("id", cleanId);
      if (err1) {
        console.warn("[ServerDb] Supabase companion delete error:", err1.message || err1);
      }
      if (cleanSlug && cleanSlug !== cleanId) {
        const { error: err2 } = await supabaseAdmin.from("companions").delete().eq("id", cleanSlug);
        if (err2) {
          console.warn("[ServerDb] Supabase companion slug delete error:", err2.message || err2);
        }
      }
    } catch (err: unknown) {
      console.warn("[ServerDb] Supabase companion delete note:", err);
    }
  }

  // 2. Save to Firestore
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

  // 3. Save to local fallback
  try {
    const filePath = getStoragePath("deleted_characters.json");
    const existing = safeReadJsonFile<string[]>(filePath, []);
    const updated = Array.from(new Set([...existing, cleanId, ...(cleanSlug ? [cleanSlug] : [])]));
    safeWriteJsonFile(filePath, updated);
  } catch {}
}

export async function getPersistentCustomCharacters(): Promise<Character[]> {
  // 1. Primary: Try reading from Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("companions")
        .select("*")
        .eq("is_custom", true);

      if (!error && Array.isArray(data) && data.length > 0) {
        // Read local storage to enrich any custom fields (voice, age, tags)
        const filePath = getStoragePath("custom_characters.json");
        const localList = safeReadJsonFile<Character[]>(filePath, []);
        const localMap = new Map(localList.map((c) => [c.id, c]));

        return data.map((d) => {
          const localMatch = localMap.get(d.id);
          return {
            id: d.id,
            slug: localMatch?.slug || d.id,
            name: d.name,
            age: localMatch?.age || 21,
            gender: (d.gender === "male" ? "male" : "female") as "female" | "male" | "anime",
            style: localMatch?.style || ("realistic" as const),
            tagline: d.tagline || localMatch?.tagline || "",
            desc: localMatch?.desc || d.tagline || "",
            image: d.avatar || d.image_url || localMatch?.image || "/characters/zovik_01.jpg",
            badge: d.is_vip || d.tier === "vip" ? "VIP" : localMatch?.badge,
            category: d.category || localMatch?.category || "General",
            series: true,
            verified: true,
            online: true,
            tags: localMatch?.tags || ["Custom", "AI Companion"],
            voice: localMatch?.voice || "Sweet & Warm",
            greeting: localMatch?.greeting || `Hi sweetheart, I'm ${d.name}! So happy to talk to you 💕`,
            videoUrl: d.intro_video || localMatch?.videoUrl || undefined,
            gallery: Array.isArray(d.gallery) && d.gallery.length > 0 ? d.gallery : localMatch?.gallery || [],
            messages: localMatch?.messages || [],
            accessTier: (d.tier === "vip" || d.tier === "plus" ? d.tier : d.is_vip ? "vip" : "free") as "free" | "plus" | "vip",
            isVipOnly: Boolean(d.is_vip || d.tier === "vip"),
            creatorId: localMatch?.creatorId || d.creator_id || undefined,
            creatorEmail: localMatch?.creatorEmail || d.creator_email || undefined,
          };
        });
      }
    } catch (err: unknown) {
      console.warn("[ServerDb] Supabase custom companions read note:", err);
    }
  }

  // 2. Secondary: Try reading from Firestore
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
  } catch {}

  const filePath = getStoragePath("custom_characters.json");
  return safeReadJsonFile<Character[]>(filePath, []);
}

export async function savePersistentCustomCharacter(character: Character): Promise<Character> {
  const charId = character.id || generateUniqueId("char");
  const charWithId: Character = { ...character, id: charId };

  // 1. Primary: Save to Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseAdmin.from("companions").upsert({
        id: charId,
        name: charWithId.name,
        tagline: charWithId.tagline || charWithId.desc || "",
        category: charWithId.category || "General",
        gender: charWithId.gender || "female",
        tier: charWithId.accessTier || (charWithId.isVipOnly ? "vip" : "free"),
        avatar: charWithId.image || "",
        image_url: charWithId.image || "",
        gallery: charWithId.gallery || [],
        intro_video: charWithId.videoUrl || null,
        is_vip: Boolean(charWithId.isVipOnly || charWithId.accessTier === "vip"),
        is_custom: true,
      });
      if (error) {
        console.error("[ServerDb] Supabase save companion error details:", error);
      }
    } catch (err: unknown) {
      console.warn("[ServerDb] Supabase save companion note:", err);
    }
  }

  // 2. Secondary: Save to Firestore
  try {
    const docRef = doc(db, "custom_characters", charId);
    await setDoc(docRef, charWithId);
  } catch {}

  // 3. Save to local fallback (custom_characters.json)
  try {
    const filePath = getStoragePath("custom_characters.json");
    const localExisting = safeReadJsonFile<Character[]>(filePath, []);
    const updated = [charWithId, ...localExisting.filter((c) => c.id !== charId && c.slug !== charWithId.slug)];
    safeWriteJsonFile(filePath, updated);
  } catch {}

  // 4. Also sync root and src characters.json for local persistence
  try {
    const rootPaths = [
      path.join(process.cwd(), ".data", "characters.json"),
      path.join(process.cwd(), "src", "data", "characters.json"),
    ];
    for (const rootPath of rootPaths) {
      if (fs.existsSync(rootPath)) {
        const list = safeReadJsonFile<Character[]>(rootPath, []);
        if (Array.isArray(list)) {
          const matchIndex = list.findIndex((c) => c.id === charId || c.slug === charWithId.slug);
          if (matchIndex >= 0) {
            list[matchIndex] = { ...list[matchIndex], ...charWithId };
            safeWriteJsonFile(rootPath, list);
          }
        }
      }
    }
  } catch {}

  return charWithId;
}

export async function deletePersistentCharacter(characterId: string): Promise<boolean> {
  const cleanId = characterId.trim();

  // 1. Primary: Delete from Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseAdmin.from("companions").delete().eq("id", cleanId);
      if (error) {
        console.warn("[ServerDb] Supabase delete companion error:", error.message || error);
      }
    } catch (err: unknown) {
      console.warn("[ServerDb] Supabase delete companion note:", err);
    }
  }

  // 2. Secondary: Delete from Firestore custom_characters
  try {
    const docRef = doc(db, "custom_characters", cleanId);
    await deleteDoc(docRef);
  } catch {}

  // 3. Record in persistent deleted character registry
  await recordPersistentDeletedCharacterId(cleanId);

  // 4. Remove from custom_characters.json
  try {
    const filePath = getStoragePath("custom_characters.json");
    const customList = safeReadJsonFile<Character[]>(filePath, []);
    if (Array.isArray(customList) && customList.length > 0) {
      const filtered = customList.filter((c) => c.id !== cleanId && c.slug !== cleanId);
      safeWriteJsonFile(filePath, filtered);
    }
  } catch {}

  // 5. Remove from root and src characters.json (local seed)
  try {
    const rootPaths = [
      path.join(process.cwd(), ".data", "characters.json"),
      path.join(process.cwd(), "src", "data", "characters.json"),
    ];
    for (const rootPath of rootPaths) {
      if (fs.existsSync(rootPath)) {
        const list = safeReadJsonFile<Character[]>(rootPath, []);
        if (Array.isArray(list) && list.length > 0) {
          const filtered = list.filter((c) => c.id !== cleanId && c.slug !== cleanId);
          safeWriteJsonFile(rootPath, filtered);
        }
      }
    }
  } catch {}

  return true;
}

/**
 * Universal Unified Characters Resolver
 * Returns all active characters (Default + Custom - Deleted), prioritizing Supabase Cloud Database!
 */
export async function getPersistentCharacters(): Promise<Character[]> {
  const [customChars, deletedIds] = await Promise.all([
    getPersistentCustomCharacters(),
    getPersistentDeletedCharacterIds(),
  ]);

  const dotPath = path.join(process.cwd(), ".data", "characters.json");
  const srcPath = path.join(process.cwd(), "src", "data", "characters.json");
  const rootPath = fs.existsSync(dotPath) ? dotPath : srcPath;
  const defaultChars = safeReadJsonFile<Character[]>(rootPath, []);

  // Build a lookup map of all local metadata
  const localMap = new Map<string, Character>();
  for (const c of defaultChars) {
    localMap.set(c.id.toLowerCase(), c);
    if (c.slug) localMap.set(c.slug.toLowerCase(), c);
  }
  for (const c of customChars) {
    localMap.set(c.id.toLowerCase(), c);
    if (c.slug) localMap.set(c.slug.toLowerCase(), c);
  }

  // 1. Primary: Read directly from Supabase Cloud Database
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin.from("companions").select("*");
      if (!error && Array.isArray(data) && data.length > 0) {
        const resultChars: Character[] = [];
        const seenIds = new Set<string>();

        for (const d of data) {
          const charId = (d.id || "").trim();
          const cleanId = charId.toLowerCase();
          if (deletedIds.includes(cleanId)) continue;

          seenIds.add(cleanId);
          const localMatch = localMap.get(cleanId);
          const tier = (d.tier === "vip" || d.tier === "plus" ? d.tier : d.is_vip ? "vip" : localMatch?.accessTier || "free") as "free" | "plus" | "vip";

          resultChars.push({
            id: charId,
            slug: localMatch?.slug || d.slug || charId,
            name: d.name || localMatch?.name || "AI Companion",
            age: localMatch?.age ?? (typeof d.age === "number" ? d.age : 21),
            gender: (d.gender || localMatch?.gender || "female") as "female" | "male" | "anime",
            style: localMatch?.style || ("realistic" as const),
            tagline: d.tagline || localMatch?.tagline || "",
            desc: localMatch?.desc || d.tagline || localMatch?.tagline || "",
            image: d.avatar || d.image_url || localMatch?.image || "/characters/zovik_01.jpg",
            badge: d.is_vip || d.tier === "vip" ? "VIP" : localMatch?.badge || "NEW",
            category: d.category || localMatch?.category || "General",
            series: localMatch?.series ?? true,
            verified: localMatch?.verified ?? true,
            online: localMatch?.online ?? true,
            tags: localMatch?.tags && localMatch.tags.length > 0 ? localMatch.tags : (d.category ? [d.category, "AI Companion"] : ["Trending", "AI Companion"]),
            voice: localMatch?.voice || "Warm Whisper",
            greeting: localMatch?.greeting || `Hi sweetheart, I'm ${d.name || "Zovik AI"}! So happy to talk to you 💕`,
            videoUrl: d.intro_video || localMatch?.videoUrl || undefined,
            gallery: Array.isArray(d.gallery) && d.gallery.length > 0 ? d.gallery : localMatch?.gallery || [],
            messages: localMatch?.messages || [],
            accessTier: tier,
            isVipOnly: Boolean(d.is_vip || d.tier === "vip" || localMatch?.isVipOnly),
            creatorId: localMatch?.creatorId || d.creator_id || undefined,
            creatorEmail: localMatch?.creatorEmail || d.creator_email || undefined,
          });
        }

        // Also append any local characters (custom or default) not in Supabase
        for (const [, c] of localMap.entries()) {
          const cleanId = c.id.toLowerCase();
          if (!seenIds.has(cleanId) && !deletedIds.includes(cleanId)) {
            seenIds.add(cleanId);
            resultChars.push(c);
          }
        }

        return resultChars;
      }
    } catch (err) {
      console.warn("[ServerDb] Supabase all companions read note:", err);
    }
  }

  // 2. Secondary / Local Fallback: Merge custom and local seed minus deleted
  const charMap = new Map<string, Character>();

  for (const c of defaultChars) {
    const isDeleted = deletedIds.includes(c.id.toLowerCase()) || (c.slug && deletedIds.includes(c.slug.toLowerCase()));
    if (!isDeleted) {
      charMap.set(c.id, c);
    }
  }

  for (const c of customChars) {
    const isDeleted = deletedIds.includes(c.id.toLowerCase()) || (c.slug && deletedIds.includes(c.slug.toLowerCase()));
    if (!isDeleted) {
      charMap.set(c.id, c);
    }
  }

  return Array.from(charMap.values());
}

// Alias for backwards-compatibility
export const getAllPersistentCharacters = getPersistentCharacters;

// ============================================================================
// 3. PAYMENT REQUESTS (SUBSCRIPTIONS) PERSISTENCE
// ============================================================================

export async function getPersistentPayments(): Promise<PaymentRequest[]> {
  // 1. Primary: Read from Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d) => {
          const planStr = ((d.plan || d.plan_name || "") as string).toLowerCase();
          const isPlus = planStr === "plus" || planStr.includes("plus");
          return {
            id: d.id,
            userEmail: d.user_email,
            plan: (isPlus ? "plus" : "vip") as "plus" | "vip",
            planName: d.plan_name || (isPlus ? "Plus Plan" : "VIP Membership"),
            currency: "PKR",
            amount: typeof d.amount === "number" ? d.amount : parseFloat(d.amount) || 0,
            method: d.method || "Manual",
            trxId: d.trx_id || "",
            senderName: d.user_email.split("@")[0],
            screenshot: d.screenshot || null,
            status: (d.status || "pending") as "pending" | "approved" | "rejected",
            createdAt: d.created_at,
          };
        });
      }
    } catch (err: unknown) {
      console.warn("[ServerDb] Supabase payment_requests read note:", err);
    }
  }

  // 2. Secondary: Read from Firestore
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
  } catch {}

  // 3. Fallback to local file
  const storagePath = getStoragePath("payment_requests.json");
  const localList = safeReadJsonFile<PaymentRequest[]>(storagePath, []);
  if (localList.length > 0) return localList;

  const rootPath = path.join(process.cwd(), ".data", "payment_requests.json");
  return safeReadJsonFile<PaymentRequest[]>(rootPath, []);
}

export async function savePersistentPayment(payment: PaymentRequest): Promise<PaymentRequest> {
  const payId = payment.id || generateUniqueId("pay");
  const paymentWithId: PaymentRequest = { ...payment, id: payId };

  // 1. Primary: Save to Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("payment_requests").upsert({
        id: payId,
        user_email: paymentWithId.userEmail,
        plan_name: paymentWithId.planName,
        amount: paymentWithId.amount,
        method: paymentWithId.method,
        trx_id: paymentWithId.trxId,
        screenshot: paymentWithId.screenshot || null,
        status: paymentWithId.status,
        created_at: paymentWithId.createdAt || new Date().toISOString(),
      });
    } catch (err: unknown) {
      console.warn("[ServerDb] Supabase save payment note:", err);
    }
  }

  // 2. Secondary: Save to Firestore
  try {
    const docRef = doc(db, "payment_requests", payId);
    await setDoc(docRef, paymentWithId);
  } catch {}

  // 3. Save to local fallback
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

  // 1. Primary: Update in Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin
        .from("payment_requests")
        .update({ status })
        .eq("id", paymentId);
    } catch (err: unknown) {
      console.warn("[ServerDb] Supabase update payment status note:", err);
    }
  }

  // 2. Secondary: Update in Firestore
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
  } catch {}

  // 3. Fallback: Update in local cache
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

export async function deletePersistentPayment(paymentId: string): Promise<boolean> {
  const cleanId = paymentId.trim();

  // 1. Check if payment has screenshot in Supabase Storage and remove it
  try {
    const all = await getPersistentPayments();
    const target = all.find((p) => p.id === cleanId);
    if (target?.screenshot && isSupabaseConfigured()) {
      try {
        const marker = "/zovik-media/";
        if (target.screenshot.includes(marker)) {
          const filePath = target.screenshot.split(marker)[1];
          if (filePath) {
            await supabaseAdmin.storage.from("zovik-media").remove([decodeURIComponent(filePath)]);
          }
        }
      } catch (err) {
        console.warn("[ServerDb] Supabase storage slip delete note:", err);
      }
    }
  } catch {}

  // 2. Delete from Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("payment_requests").delete().eq("id", cleanId);
    } catch (err) {
      console.warn("[ServerDb] Supabase delete payment note:", err);
    }
  }

  // 3. Delete from Firestore
  try {
    const docRef = doc(db, "payment_requests", cleanId);
    await deleteDoc(docRef);
  } catch {}

  // 4. Delete from local cache
  try {
    const filePath = getStoragePath("payment_requests.json");
    const list = safeReadJsonFile<PaymentRequest[]>(filePath, []);
    if (Array.isArray(list) && list.length > 0) {
      const filtered = list.filter((p) => p.id !== cleanId);
      safeWriteJsonFile(filePath, filtered);
    }
  } catch {}

  return true;
}

