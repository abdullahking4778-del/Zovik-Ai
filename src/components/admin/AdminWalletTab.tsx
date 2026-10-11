"use client";

import React, { useState, useEffect } from "react";
import {
  Coins,
  Gift,
  Search,
  CheckCircle2,
  AlertCircle,
  History,
  TrendingUp,
  Sliders,
  DollarSign,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import { UserAccount } from "@/types";

interface AdminWalletTabProps {
  users: UserAccount[];
}

export const AdminWalletTab: React.FC<AdminWalletTabProps> = ({ users }) => {
  // 1. Gift / Bonus Form State
  const [targetEmail, setTargetEmail] = useState("");
  const [giftAmount, setGiftAmount] = useState<number>(200);
  const [giftReason, setGiftReason] = useState("Gift for my dear friend ❤️");
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [giftStatusMsg, setGiftStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 2. Lookup & Audit State
  const [searchEmail, setSearchEmail] = useState("");
  const [inspectedWallet, setInspectedWallet] = useState<any>(null);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // 3. Economy Settings State
  const [usdtRate, setUsdtRate] = useState<number>(280);
  const [minCoins, setMinCoins] = useState<number>(50);
  const [costChat, setCostChat] = useState<number>(1);
  const [costPhoto, setCostPhoto] = useState<number>(5);
  const [costVoice, setCostVoice] = useState<number>(2);
  const [isSavingEconomy, setIsSavingEconomy] = useState(false);
  const [economyMsg, setEconomyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load Economy Config on mount
  useEffect(() => {
    fetch("/api/admin/wallet", {
      headers: { "x-zovik-admin-request": "1" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.economy) {
          setUsdtRate(data.economy.usdtRate || 280);
          setMinCoins(data.economy.minPurchaseCoins || 50);
          setCostChat(data.economy.costPerMessage || 1);
          setCostPhoto(data.economy.costPerPhoto || 5);
          setCostVoice(data.economy.costPerVoice || 2);
        }
      })
      .catch((err) => console.warn("[AdminWalletTab] Load economy note:", err));
  }, []);

  // Handle Send Free Coins / Gift
  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    setGiftStatusMsg(null);

    const email = targetEmail.trim().toLowerCase();
    if (!email) {
      setGiftStatusMsg({ type: "error", text: "Please enter user email address." });
      return;
    }

    if (!giftAmount || giftAmount <= 0) {
      setGiftStatusMsg({ type: "error", text: "Gift amount must be at least 1 coin." });
      return;
    }

    if (!giftReason || giftReason.trim().length < 6) {
      setGiftStatusMsg({ type: "error", text: "Audit reason must be at least 6 characters." });
      return;
    }

    setIsSendingGift(true);
    try {
      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zovik-admin-request": "1",
        },
        body: JSON.stringify({
          targetUserId: email,
          amount: Math.floor(giftAmount),
          type: "BONUS",
          reason: giftReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGiftStatusMsg({
          type: "success",
          text: `Success! Added ${giftAmount} free coins to ${email}. New Balance: ${data.wallet?.balance} coins.`,
        });
        setTargetEmail("");
        setGiftReason("Gift for my dear friend ❤️");
        // If inspecting same user, refresh
        if (searchEmail.toLowerCase() === email) {
          handleInspectUser(email);
        }
      } else {
        setGiftStatusMsg({ type: "error", text: data.error || "Failed to award bonus coins." });
      }
    } catch {
      setGiftStatusMsg({ type: "error", text: "Network error sending bonus coins." });
    } finally {
      setIsSendingGift(false);
    }
  };

  // Inspect user wallet
  const handleInspectUser = async (emailToSearch?: string) => {
    const email = (emailToSearch || searchEmail).trim().toLowerCase();
    if (!email) return;

    setIsSearching(true);
    setSearchError("");
    setInspectedWallet(null);
    setWalletHistory([]);

    try {
      const res = await fetch(`/api/admin/wallet?userId=${encodeURIComponent(email)}`, {
        headers: { "x-zovik-admin-request": "1" },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInspectedWallet(data.wallet);
        setWalletHistory(data.history || []);
      } else {
        setSearchError(data.error || "User wallet not found.");
      }
    } catch {
      setSearchError("Failed to load user wallet details.");
    } finally {
      setIsSearching(false);
    }
  };

  // Save Economy Settings
  const handleSaveEconomy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEconomy(true);
    setEconomyMsg(null);

    try {
      const res = await fetch("/api/admin/wallet", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-zovik-admin-request": "1",
        },
        body: JSON.stringify({
          usdtRate: Number(usdtRate),
          minPurchaseCoins: Number(minCoins),
          costPerMessage: Number(costChat),
          costPerPhoto: Number(costPhoto),
          costPerVoice: Number(costVoice),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEconomyMsg({ type: "success", text: "Economy settings saved successfully!" });
      } else {
        setEconomyMsg({ type: "error", text: data.error || "Failed to save settings." });
      }
    } catch {
      setEconomyMsg({ type: "error", text: "Network error saving settings." });
    } finally {
      setIsSavingEconomy(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="size-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Coins className="size-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Coins & Virtual Wallet Management</h2>
          </div>
          <p className="text-xs text-[#aeaeae] mt-1">
            Gift free bonus coins to friends, audit immutable ledgers, and manage 1 PKR = 1 Coin rates.
          </p>
        </div>
      </div>

      {/* Grid: Gift Coins & Economy Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: GIFT FREE COINS */}
        <div className="rounded-3xl bg-gradient-to-b from-[#1b1226] to-[#120a1c] border border-pink-500/20 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 size-32 rounded-full bg-pink-500/10 blur-2xl pointer-events-none" />

          <div className="flex items-center space-x-2 text-pink-400 mb-4">
            <Gift className="size-5" />
            <h3 className="font-black text-white text-base">Gift Free Coins to Friends / Users</h3>
          </div>
          <p className="text-xs text-[#aeaeae] mb-5">
            Apne dosto ko free coins reward karein ya kisi user ko bonus coins send karein. Har transaction ka audit trail banta hai.
          </p>

          <form onSubmit={handleSendGift} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">User Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="e.g. friend@gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-500 font-mono"
                  required
                />
              </div>
              {users.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-white/40">Quick select:</span>
                  {users.slice(0, 4).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setTargetEmail(u.email)}
                      className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-pink-300 font-mono"
                    >
                      {u.email.split("@")[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Coins Amount (1 PKR = 1 Coin)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-amber-300 font-black text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Quick Amount</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[50, 200, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setGiftAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${
                        giftAmount === amt
                          ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                          : "bg-white/5 hover:bg-white/10 text-white border border-white/5"
                      }`}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">Audit Reason (Min 6 letters)</label>
              <input
                type="text"
                value={giftReason}
                onChange={(e) => setGiftReason(e.target.value)}
                placeholder="e.g. Gift for friend / promo reward"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-500"
                required
              />
            </div>

            {giftStatusMsg && (
              <div
                className={`flex items-center space-x-2 p-3 rounded-xl text-xs font-bold ${
                  giftStatusMsg.type === "success"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {giftStatusMsg.type === "success" ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span>{giftStatusMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSendingGift}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50"
            >
              {isSendingGift ? "Processing Mutation..." : "Gift Coins Now 🎁"}
            </button>
          </form>
        </div>

        {/* CARD 2: ECONOMY & RATE SETTINGS */}
        <div className="rounded-3xl bg-gradient-to-b from-[#1b1226] to-[#120a1c] border border-amber-500/20 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 size-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

          <div className="flex items-center space-x-2 text-amber-400 mb-4">
            <Sliders className="size-5" />
            <h3 className="font-black text-white text-base">Coins Economy & USDT Conversion Settings</h3>
          </div>
          <p className="text-xs text-[#aeaeae] mb-5">
            Set international USDT conversion rate and cost per feature. All changes update dynamically on the platform.
          </p>

          <form onSubmit={handleSaveEconomy} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  1 USDT = Coins (PKR)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={usdtRate}
                    onChange={(e) => setUsdtRate(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-emerald-400 font-black text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-white/40 font-bold">Coins</span>
                </div>
                <span className="text-[10px] text-white/40 mt-1 block">Current market rate</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Min Purchase Coins</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={minCoins}
                    onChange={(e) => setMinCoins(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-white/40 font-bold">PKR</span>
                </div>
                <span className="text-[10px] text-white/40 mt-1 block">Minimum allowed buy</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5">
              <label className="block text-xs font-extrabold text-amber-300 uppercase tracking-wider mb-2">
                Action Deduction Costs (Per Use)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[11px] text-white/60 block mb-1">Chat Msg</span>
                  <input
                    type="number"
                    min="0"
                    value={costChat}
                    onChange={(e) => setCostChat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-bold text-xs"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] text-white/60 block mb-1">HD Photo</span>
                  <input
                    type="number"
                    min="0"
                    value={costPhoto}
                    onChange={(e) => setCostPhoto(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-bold text-xs"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] text-white/60 block mb-1">Voice Note</span>
                  <input
                    type="number"
                    min="0"
                    value={costVoice}
                    onChange={(e) => setCostVoice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-bold text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {economyMsg && (
              <div
                className={`flex items-center space-x-2 p-3 rounded-xl text-xs font-bold ${
                  economyMsg.type === "success"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {economyMsg.type === "success" ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span>{economyMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingEconomy}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <Save className="size-4 text-amber-400" />
              <span>{isSavingEconomy ? "Saving..." : "Save Economy Settings"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* SECTION 2: USER WALLET AUDIT & SEARCH */}
      <div className="rounded-3xl bg-[#140b1c] border border-white/5 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Search className="size-4 text-purple-400" />
              <span>Inspect User Wallet & Ledger History</span>
            </h3>
            <p className="text-xs text-[#aeaeae]">
              Look up any user&apos;s real-time balance and immutable ledger entries.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search user email..."
              className="px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-white/30 font-mono focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => handleInspectUser()}
              disabled={isSearching}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all disabled:opacity-50"
            >
              {isSearching ? "Searching..." : "Inspect"}
            </button>
          </div>
        </div>

        {searchError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
            {searchError}
          </div>
        )}

        {inspectedWallet && (
          <div className="pt-4 border-t border-white/5 space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-white/40 uppercase font-black tracking-wider">User Account</span>
                <p className="text-sm font-bold text-white font-mono truncate">{inspectedWallet.userId}</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20">
                <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider">Active Balance</span>
                <p className="text-xl font-black text-amber-400">🪙 {inspectedWallet.balance.toLocaleString()} Coins</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 uppercase font-black tracking-wider">Wallet Status</span>
                <p className="text-sm font-extrabold text-emerald-400 uppercase flex items-center space-x-1">
                  <ShieldCheck className="size-4 mr-1" />
                  {inspectedWallet.status} (Verified)
                </p>
              </div>
            </div>

            {/* History Table */}
            <div>
              <h4 className="text-xs font-bold text-white mb-2 flex items-center space-x-1.5">
                <History className="size-3.5 text-pink-400" />
                <span>Recent Ledger Transactions ({walletHistory.length})</span>
              </h4>

              {walletHistory.length === 0 ? (
                <p className="text-xs text-white/40 italic py-2">No transactions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/30">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1024] text-[#aeaeae] text-[10px] uppercase font-bold">
                      <tr>
                        <th className="p-3">Type</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Balance Before → After</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {walletHistory.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02]">
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                tx.type === "CREDIT" || tx.type === "BONUS"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-white">
                            {tx.type === "CREDIT" || tx.type === "BONUS" ? `+${tx.amount}` : `-${tx.amount}`}
                          </td>
                          <td className="p-3 text-white/80 font-sans">{tx.reason}</td>
                          <td className="p-3 text-white/60">
                            {tx.balanceBefore} → <span className="font-bold text-white">{tx.balanceAfter}</span>
                          </td>
                          <td className="p-3 text-white/40 font-sans">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
