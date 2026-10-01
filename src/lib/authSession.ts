import { NextRequest } from "next/server";
import { adminAuth } from "./firebaseAdmin";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export async function resolveServerUser(req: NextRequest, clientToken?: string): Promise<{
  authenticated: boolean;
  userId?: string;
  tier: "free" | "plus" | "vip";
}> {
  // Try to get token from header or cookie if not provided
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

  if (!token || typeof token !== "string") {
    return { authenticated: false, tier: "free" };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Fetch user from Firestore using client SDK to avoid needing service account locally
    const userDocRef = doc(db, "users", decodedToken.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      let currentTier = data?.zovik_tier || "free";
      
      // Check expiration if any
      if ((currentTier === "vip" || currentTier === "plus") && data?.subscriptionEndsAt) {
        const endsAt = new Date(data.subscriptionEndsAt).getTime();
        if (endsAt < Date.now()) {
          currentTier = "free";
        }
      }
      
      return {
        authenticated: true,
        userId: decodedToken.uid,
        tier: currentTier as "free" | "plus" | "vip",
      };
    }

    return {
      authenticated: true,
      userId: decodedToken.uid,
      tier: "free",
    };
  } catch (error) {
    return { authenticated: false, tier: "free" };
  }
}

