import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  const usersMap = new Map<string, any>();

  try {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
    snapshot.forEach((d) => {
      const data = d.data();
      const tier = data.zovik_tier || "free";
      usersMap.set(d.id, {
        id: d.id,
        email: data.email || "No Email",
        name: data.name || data.email?.split("@")[0] || "User",
        photoURL: data.photoURL || null,
        tier: tier,
        isVip: tier === "vip",
        subscriptionDays: data.subscriptionDays || (tier === "vip" ? 30 : 0),
        subscriptionStart: data.subscriptionStart || null,
        subscriptionEndsAt: data.subscriptionEndsAt || null,
        storageRetentionDays: data.storageRetentionDays || (tier === "vip" ? 35 : tier === "plus" ? 30 : 7),
        createdAt: data.createdAt || new Date().toISOString(),
        lastLoginAt: data.lastLoginAt || null,
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
    const { userId, isVip, tier, subscriptionDays, storageRetentionDays } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
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

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        zovik_tier: assignedTier,
        subscriptionDays: days,
        subscriptionStart: days > 0 ? now.toISOString() : null,
        subscriptionEndsAt: endsAt,
        storageRetentionDays: retention,
      });
    } catch (fsErr) {
      console.warn("Firestore updateDoc error:", fsErr);
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
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update user" }, { status: 500 });
  }
}

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

    try {
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);
    } catch (fsErr) {
      console.warn("Firestore deleteDoc error:", fsErr);
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete user" }, { status: 500 });
  }
}

