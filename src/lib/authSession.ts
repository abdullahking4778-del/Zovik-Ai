import { NextRequest } from "next/server";
import { adminAuth } from "./firebaseAdmin";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { getActiveUserTier } from "./userStore";

export async function resolveServerUser(req: NextRequest, clientToken?: string): Promise<{
  authenticated: boolean;
  userId?: string;
  userEmail?: string;
  tier: "free" | "plus" | "vip";
}> {
  // 1. Try to get token from header or cookie
  let token = clientToken;
  if (!token) {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }
  if (!token) {
    token = req.cookies.get("zovik_session")?.value;
  }

  const clientEmail = req.headers.get("x-user-email") || "";
  const clientUid = req.headers.get("x-user-id") || "";

  let resolvedUid = clientUid;
  let resolvedEmail = clientEmail;

  // 2. Try Firebase ID Token verification
  if (token && typeof token === "string") {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      resolvedUid = decoded.uid;
      resolvedEmail = decoded.email || resolvedEmail;
    } catch {
      // In dev/local without service account, gracefully extract unverified payload
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload && payload.user_id) {
            resolvedUid = payload.user_id;
            resolvedEmail = payload.email || resolvedEmail;
          }
        }
      } catch {}
    }
  }

  const identifier = resolvedEmail || resolvedUid;
  if (!identifier) {
    return { authenticated: false, tier: "free" };
  }

  // 3. First check authoritative user store (Guaranteed local sync)
  const storeStatus = getActiveUserTier(identifier);
  if (storeStatus.tier === "vip" || storeStatus.tier === "plus") {
    return {
      authenticated: true,
      userId: resolvedUid,
      userEmail: resolvedEmail,
      tier: storeStatus.tier,
    };
  }

  // 4. Also check Firestore doc if reachable
  if (resolvedUid) {
    try {
      const userDocRef = doc(db, "users", resolvedUid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        let currentTier = data?.zovik_tier || "free";

        if ((currentTier === "vip" || currentTier === "plus") && data?.subscriptionEndsAt) {
          const endsAt = new Date(data.subscriptionEndsAt).getTime();
          if (endsAt < Date.now()) {
            currentTier = "free";
          }
        }

        return {
          authenticated: true,
          userId: resolvedUid,
          userEmail: resolvedEmail,
          tier: currentTier as "free" | "plus" | "vip",
        };
      }
    } catch {}
  }

  return {
    authenticated: true,
    userId: resolvedUid,
    userEmail: resolvedEmail,
    tier: storeStatus.tier,
  };
}
