import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getAllStoredUsers, upsertStoredUser, upsertStoredUserAsync, saveAllStoredUsers } from "@/lib/userStore";
import { UserAccount } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  const usersMap = new Map<string, UserAccount>();

  // 1. Load from authoritative local store
  try {
    const localUsers = getAllStoredUsers();
    localUsers.forEach((u) => {
      usersMap.set(u.id, u);
    });
  } catch (err) {
    console.warn("Local users fetch failed:", err);
  }

  // 2. Merge with Firestore users (if reachable)
  try {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
    snapshot.forEach((d) => {
      const data = d.data();
      const existing = usersMap.get(d.id);
      const tier = existing?.tier || data.zovik_tier || "free";
      
      usersMap.set(d.id, {
        id: d.id,
        email: data.email || existing?.email || "No Email",
        name: data.name || existing?.name || data.email?.split("@")[0] || "User",
        photoURL: data.photoURL || existing?.photoURL || null,
        tier: tier,
        isVip: tier === "vip",
        subscriptionDays: existing?.subscriptionDays || data.subscriptionDays || (tier === "vip" ? 30 : 0),
        subscriptionStart: existing?.subscriptionStart || data.subscriptionStart || null,
        subscriptionEndsAt: existing?.subscriptionEndsAt || data.subscriptionEndsAt || null,
        storageRetentionDays: existing?.storageRetentionDays || data.storageRetentionDays || (tier === "vip" ? 35 : tier === "plus" ? 30 : 7),
        createdAt: data.createdAt || existing?.createdAt || new Date().toISOString(),
        lastLoginAt: data.lastLoginAt || existing?.lastLoginAt || null,
      });
    });
  } catch (err) {
    console.warn("Firestore fetch users failed:", err);
  }

  const users = Array.from(usersMap.values());
  return NextResponse.json({ users, total: users.length });
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    const { userId, email, isVip, tier, subscriptionDays, storageRetentionDays } = await req.json();

    if (!userId && !email) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    }

    const assignedTier = tier && (tier === "free" || tier === "plus" || tier === "vip")
      ? tier
      : isVip
      ? "vip"
      : "free";

    const days = typeof subscriptionDays === "number" ? subscriptionDays : assignedTier === "vip" ? 30 : 0;
    const now = new Date();
    const endsAt = days > 0 ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString() : null;

    const retention = typeof storageRetentionDays === "number" 
      ? storageRetentionDays 
      : assignedTier === "vip" ? 35 : assignedTier === "plus" ? 30 : 7;

    const primaryKey = userId || email;

    // 1. Authoritative store & cloud database update
    const syncResult = await upsertStoredUserAsync(primaryKey, {
      id: userId || primaryKey,
      email: email || undefined,
      tier: assignedTier,
      isVip: assignedTier === "vip",
      subscriptionDays: days,
      subscriptionStart: days > 0 ? now.toISOString() : null,
      subscriptionEndsAt: endsAt,
      storageRetentionDays: retention,
    });
    const updatedLocal = syncResult.user;

    if (email && userId && email !== userId) {
      try {
        upsertStoredUser(email, {
          id: userId,
          email: email,
          tier: assignedTier,
          isVip: assignedTier === "vip",
          subscriptionDays: days,
          subscriptionStart: days > 0 ? now.toISOString() : null,
          subscriptionEndsAt: endsAt,
          storageRetentionDays: retention,
        });
      } catch {}
    }

    // 2. Also try Firestore update
    try {
      if (userId) {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          zovik_tier: assignedTier,
          subscriptionDays: days,
          subscriptionStart: days > 0 ? now.toISOString() : null,
          subscriptionEndsAt: endsAt,
          storageRetentionDays: retention,
        });
      }
    } catch (fsErr) {
      console.warn("Firestore updateDoc note (Handled via authoritative store):", fsErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        tier: assignedTier,
        isVip: assignedTier === "vip",
        subscriptionDays: days,
        subscriptionEndsAt: endsAt,
        storageRetentionDays: retention,
      },
    });
  } catch (e: unknown) {
    console.error("[Admin Users PUT Error]:", e);
    return NextResponse.json({ error: "Internal server error updating user" }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    // 1. Delete from local store
    try {
      const localUsers = getAllStoredUsers().filter((u) => u.id !== userId);
      saveAllStoredUsers(localUsers);
    } catch (err) {
      console.warn("Local user deletion failed:", err);
    }

    // 2. Delete from Firestore
    try {
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);
    } catch (fsErr) {
      console.warn("Firestore deleteDoc note:", fsErr);
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (e: unknown) {
    console.error("[Admin Users DELETE Error]:", e);
    return NextResponse.json({ error: "Internal server error deleting user" }, { status: 500 });
  }
}
