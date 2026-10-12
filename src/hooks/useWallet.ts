"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

export interface WalletState {
  balance: number;
  currency: string;
  status: string;
  history: any[];
  economy: {
    usdtRate: number;
    minPurchaseCoins: number;
    costPerMessage: number;
    costPerPhoto: number;
    costPerVoice: number;
    packages: any[];
  };
  loading: boolean;
  error: string | null;
}

export function useWallet() {
  const { user, isLocallyLoggedIn } = useAuth();
  const [walletState, setWalletState] = useState<WalletState>({
    balance: 0,
    currency: "CREDIT",
    status: "active",
    history: [],
    economy: {
      usdtRate: 280,
      minPurchaseCoins: 50,
      costPerMessage: 1,
      costPerPhoto: 5,
      costPerVoice: 2,
      packages: [],
    },
    loading: true,
    error: null,
  });

  const fetchWallet = useCallback(async () => {
    if (!user && !isLocallyLoggedIn) {
      setWalletState((prev) => ({ ...prev, balance: 0, history: [], loading: false, error: null }));
      return;
    }

    try {
      let token: string | null = null;
      if (user) {
        token = await user.getIdToken().catch(() => null);
      }

      const res = await fetch("/api/wallet", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Clear sensitive state on auth expiry or invalid session
          setWalletState((prev) => ({ ...prev, balance: 0, history: [], loading: false, error: null }));
          return;
        }
        throw new Error("Failed to load wallet");
      }

      const data = await res.json();
      if (data.success && data.wallet) {
        setWalletState({
          balance: Number(data.wallet.balance) || 0,
          currency: data.wallet.currency || "CREDIT",
          status: data.wallet.status || "active",
          history: data.history || [],
          economy: data.economy || {
            usdtRate: 280,
            minPurchaseCoins: 50,
            costPerMessage: 1,
            costPerPhoto: 5,
            costPerVoice: 2,
            packages: [],
          },
          loading: false,
          error: null,
        });
      }
    } catch (err: unknown) {
      setWalletState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Error loading wallet",
      }));
    }
  }, [user, isLocallyLoggedIn]);

  useEffect(() => {
    fetchWallet();

    const handleUpdate = () => fetchWallet();
    const handleFocus = () => fetchWallet();
    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchWallet();
      }
    };

    window.addEventListener("zovik_wallet_updated", handleUpdate);
    window.addEventListener("focus", handleFocus);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    // Dynamic background sync every 25 seconds
    const intervalId = setInterval(fetchWallet, 25000);

    return () => {
      window.removeEventListener("zovik_wallet_updated", handleUpdate);
      window.removeEventListener("focus", handleFocus);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
      clearInterval(intervalId);
    };
  }, [fetchWallet]);

  return {
    ...walletState,
    refreshWallet: fetchWallet,
  };
}

export function notifyWalletUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zovik_wallet_updated"));
  }
}
