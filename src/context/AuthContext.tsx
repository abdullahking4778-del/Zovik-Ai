"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { safeLocalStorage } from "@/lib/storage";

export interface UserFirestoreData {
  email: string | null;
  name?: string | null;
  photoURL?: string | null;
  zovik_tier: "free" | "plus" | "vip";
  subscriptionStart?: string;
  subscriptionDays?: number;
  subscriptionEndsAt?: string;
  storageRetentionDays?: number;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  tier: string;
  userData: UserFirestoreData | null;
  loading: boolean;
  isLocallyLoggedIn: boolean;
  isLoginOpen: boolean;
  setIsLoginOpen: (open: boolean) => void;
  loginPromptMessage: string | null;
  setLoginPromptMessage: (msg: string | null) => void;
  requireAuth: (action: () => void, promptMessage?: string) => boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  tier: "free",
  userData: null,
  loading: true,
  isLocallyLoggedIn: false,
  isLoginOpen: false,
  setIsLoginOpen: () => {},
  loginPromptMessage: null,
  setLoginPromptMessage: () => {},
  requireAuth: () => false,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  resetPassword: async () => {},
  updateUserProfile: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tier, setTier] = useState<string>("free");
  const [userData, setUserData] = useState<UserFirestoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocallyLoggedIn, setIsLocallyLoggedIn] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Instant hydration from local storage on mount (prevents "Log In" button flicker on page refresh)
  useEffect(() => {
    const savedLogin = safeLocalStorage.getBoolean("zovik_logged_in");
    setIsLocallyLoggedIn(savedLogin);
    const savedTier = safeLocalStorage.getRawItem("zovik_tier");
    if (savedTier) setTier(savedTier);
    const cached = safeLocalStorage.getItem<UserFirestoreData>("zovik_user_cache");
    if (cached && typeof cached === "object") {
      setUserData(cached);
      if (cached.zovik_tier) setTier(cached.zovik_tier);
    }
  }, []);

  // When user logs in successfully and there was a pending action, execute it!
  useEffect(() => {
    if (user && pendingAction) {
      pendingAction();
      setPendingAction(null);
      setIsLoginOpen(false);
      setLoginPromptMessage(null);
    }
  }, [user, pendingAction]);

  useEffect(() => {
    let firestoreUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
      }

      if (currentUser) {
        setIsLocallyLoggedIn(true);
        safeLocalStorage.setItem("zovik_logged_in", "true");

        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          
          // Real-time listener for user document in Firestore
          firestoreUnsubscribe = onSnapshot(userDocRef, async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as UserFirestoreData;
              setUserData(data);
              let currentTier = data.zovik_tier || "free";
              if ((currentTier === "vip" || currentTier === "plus") && data.subscriptionEndsAt) {
                const endsAt = new Date(data.subscriptionEndsAt).getTime();
                if (endsAt < Date.now()) {
                  currentTier = "free";
                }
              }
              setTier(currentTier);

              safeLocalStorage.setItem("zovik_tier", currentTier);
              safeLocalStorage.setItem("zovik_is_vip", (currentTier === "vip" || currentTier === "plus") ? "true" : "false");
              safeLocalStorage.setItem("zovik_user_cache", data);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("zovik_tier_changed", { detail: { tier: currentTier } }));
              }
            } else {
              // Create document if doesn't exist
              const initialData: UserFirestoreData = {
                email: currentUser.email,
                name: currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "User"),
                photoURL: currentUser.photoURL || null,
                zovik_tier: "free",
                storageRetentionDays: 7,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, initialData);
              setUserData(initialData);
              setTier("free");
              safeLocalStorage.setItem("zovik_tier", "free");
              safeLocalStorage.setItem("zovik_is_vip", "false");
              safeLocalStorage.setItem("zovik_user_cache", initialData);
            }
          });

          // Check authoritative server status for instant VIP / Plus grants
          fetch(`/api/user/status?email=${encodeURIComponent(currentUser.email || "")}&uid=${currentUser.uid}`)
            .then((res) => res.json())
            .then(async (statusData) => {
              if (statusData && statusData.tier && statusData.tier !== "free") {
                setTier(statusData.tier);
                setUserData((prev) => ({
                  ...(prev || { email: currentUser.email, zovik_tier: statusData.tier }),
                  zovik_tier: statusData.tier,
                  subscriptionEndsAt: statusData.subscriptionEndsAt,
                  storageRetentionDays: statusData.storageRetentionDays,
                }));

                safeLocalStorage.setItem("zovik_tier", statusData.tier);
                safeLocalStorage.setItem("zovik_is_vip", (statusData.tier === "vip" || statusData.tier === "plus") ? "true" : "false");
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("zovik_tier_changed", { detail: { tier: statusData.tier } }));
                }

                // Client-side self-sync to Firestore (authorized under user's own auth token)
                try {
                  const uRef = doc(db, "users", currentUser.uid);
                  await updateDoc(uRef, {
                    zovik_tier: statusData.tier,
                    subscriptionEndsAt: statusData.subscriptionEndsAt,
                    storageRetentionDays: statusData.storageRetentionDays,
                  });
                } catch {}
              }
            })
            .catch(() => {});
        } catch (error) {
          console.error("Error setting up user snapshot in Firestore:", error);
        }
      } else {
        setIsLocallyLoggedIn(false);
        setUserData(null);
        setTier("free");
        safeLocalStorage.removeItem("zovik_logged_in");
        safeLocalStorage.removeItem("zovik_user_cache");
        safeLocalStorage.removeItem("zovik_tier");
        safeLocalStorage.removeItem("zovik_is_vip");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("zovik_tier_changed", { detail: { tier: "free" } }));
        }
      }
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) firestoreUnsubscribe();
    };
  }, []);

  // Smart Auth Guard helper
  const requireAuth = (action: () => void, promptMessage?: string): boolean => {
    if (user) {
      action();
      return true;
    }
    setPendingAction(() => action);
    setLoginPromptMessage(promptMessage || "Is feature ko access karne ke liye pehle login karein.");
    setIsLoginOpen(true);
    return false;
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setIsLocallyLoggedIn(true);
        safeLocalStorage.setItem("zovik_logged_in", "true");
        const userDocRef = doc(db, "users", result.user.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          const initialData: UserFirestoreData = {
            email: result.user.email,
            name: result.user.displayName || (result.user.email ? result.user.email.split("@")[0] : "User"),
            photoURL: result.user.photoURL,
            zovik_tier: "free",
            storageRetentionDays: 7,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, initialData);
          setUserData(initialData);
        } else {
          await updateDoc(userDocRef, {
            lastLoginAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Error logging in with Google:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (result.user) {
        setIsLocallyLoggedIn(true);
        safeLocalStorage.setItem("zovik_logged_in", "true");
        const userDocRef = doc(db, "users", result.user.uid);
        await updateDoc(userDocRef, {
          lastLoginAt: new Date().toISOString(),
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Error logging in with email and password:", error);
      throw error;
    }
  };

  const signupWithEmail = async (email: string, password: string, name?: string) => {
    try {
      const cleanEmail = email.trim();
      const cleanName = (name && name.trim()) || cleanEmail.split("@")[0] || "User";
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      
      if (result.user) {
        await updateProfile(result.user, {
          displayName: cleanName,
        });

        setIsLocallyLoggedIn(true);
        safeLocalStorage.setItem("zovik_logged_in", "true");

        const userDocRef = doc(db, "users", result.user.uid);
        const initialData: UserFirestoreData = {
          email: cleanEmail,
          name: cleanName,
          photoURL: null,
          zovik_tier: "free",
          storageRetentionDays: 7,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, initialData);
        setUserData(initialData);
      }
    } catch (error) {
      console.error("Error signing up with email and password:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, {
        displayName: updates.displayName !== undefined ? updates.displayName : auth.currentUser.displayName,
        photoURL: updates.photoURL !== undefined ? updates.photoURL : auth.currentUser.photoURL,
      });

      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const fsUpdates: Partial<UserFirestoreData> = {};
      if (updates.displayName !== undefined) fsUpdates.name = updates.displayName;
      if (updates.photoURL !== undefined) fsUpdates.photoURL = updates.photoURL;

      await updateDoc(userDocRef, fsUpdates);
      setUser({ ...auth.currentUser });
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsLocallyLoggedIn(false);
      setUser(null);
      setUserData(null);
      setTier("free");
      safeLocalStorage.removeItem("zovik_logged_in");
      safeLocalStorage.removeItem("zovik_user_cache");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tier,
        userData,
        loading,
        isLocallyLoggedIn,
        isLoginOpen,
        setIsLoginOpen,
        loginPromptMessage,
        setLoginPromptMessage,
        requireAuth,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        resetPassword,
        updateUserProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
