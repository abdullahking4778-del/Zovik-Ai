"use client";

import React, { useState, useEffect } from "react";
import { Lock, EyeOff, Eye, CheckCircle2, AlertCircle, Megaphone, Smartphone, Save, Sparkles } from "lucide-react";
import { AnnouncementConfig, PaymentAccountConfig } from "@/types";

interface AdminSettingsTabProps {
  showPasswordDetails: boolean;
  setShowPasswordDetails: (show: boolean) => void;
  activeMasterPassword: string;
  passwordStatusMsg: { type: "success" | "error"; text: string } | null;
  currentMasterPassword: string;
  setCurrentMasterPassword: (val: string) => void;
  newMasterPassword: string;
  setNewMasterPassword: (val: string) => void;
  confirmMasterPassword: string;
  setConfirmMasterPassword: (val: string) => void;
  isUpdatingPassword: boolean;
  handleChangePassword: (e: React.FormEvent) => Promise<void> | void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  showPasswordDetails,
  setShowPasswordDetails,
  activeMasterPassword,
  passwordStatusMsg,
  currentMasterPassword,
  setCurrentMasterPassword,
  newMasterPassword,
  setNewMasterPassword,
  confirmMasterPassword,
  setConfirmMasterPassword,
  isUpdatingPassword,
  handleChangePassword,
}) => {
  // 1. Announcement Bar State
  const [announcement, setAnnouncement] = useState<AnnouncementConfig>({
    enabled: true,
    badge: "FLASH DEAL 🔥",
    text: "🎉 FLASH DEAL: VIP Elite Plan 50% Off — Only Rs. 400 for Today! Tap here to Unlock 18+ Uncensored Chat 💕",
    actionType: "open_premium",
  });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 2. Payment Accounts State
  const [paymentAccounts, setPaymentAccounts] = useState<Record<string, PaymentAccountConfig>>({
    easypaisa: {
      id: "easypaisa",
      name: "EasyPaisa",
      label: "EasyPaisa Mobile Account",
      number: "03427646038",
      title: "AMINA AKRAM",
      instructions: "Transfer the amount via EasyPaisa App. Enter your 11-digit Transaction ID (Trx ID) and attach payment receipt below.",
      isActive: true,
    },
    jazzcash: {
      id: "jazzcash",
      name: "JazzCash",
      label: "JazzCash Mobile Account",
      number: "03154761082",
      title: "AMINA AKRAM",
      instructions: "Transfer the amount via JazzCash App or *786#. Enter your Transaction ID (TID) and attach payment receipt below.",
      isActive: true,
    },
    nayapay: {
      id: "nayapay",
      name: "NayaPay",
      label: "NayaPay Wallet / ID",
      number: "0317 6127513",
      title: "ABDULLAH MAHMOOD",
      instructions: "Transfer to NayaPay Mobile Number / NayaPay ID. Enter your Transaction Reference ID below.",
      isActive: true,
    },
    binance: {
      id: "binance",
      name: "Binance Pay",
      label: "Binance Pay ID (USDT)",
      number: "1204011189",
      title: "Binance Pay ID",
      instructions: "Open Binance App → Go to Pay → Send via Pay ID (1204011189) → Transfer $5 (Plus) or $12 (VIP) USDT. Paste your Order / Pay ID below.",
      isActive: true,
    },
  });
  const [isSavingAccounts, setIsSavingAccounts] = useState(false);
  const [accountsMsg, setAccountsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetch("/api/announcement")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.announcement) {
          setAnnouncement(data.announcement);
        }
      })
      .catch(() => {});

    fetch("/api/payment-accounts")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.accounts) {
          setPaymentAccounts((prev) => ({ ...prev, ...data.accounts }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAnnouncement(true);
    setAnnouncementMsg(null);
    try {
      const token = localStorage.getItem("zovik_admin_session") || "";
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(announcement),
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncementMsg({ type: "success", text: "Top Announcement Patti updated successfully!" });
      } else {
        setAnnouncementMsg({ type: "error", text: data.error || "Failed to update announcement" });
      }
    } catch {
      setAnnouncementMsg({ type: "error", text: "Network error saving announcement" });
    } finally {
      setIsSavingAnnouncement(false);
      setTimeout(() => setAnnouncementMsg(null), 4000);
    }
  };

  const handleSavePaymentAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAccounts(true);
    setAccountsMsg(null);
    try {
      const token = localStorage.getItem("zovik_admin_session") || "";
      const res = await fetch("/api/admin/payment-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentAccounts),
      });
      const data = await res.json();
      if (data.success) {
        setAccountsMsg({ type: "success", text: "Payment Accounts & Numbers updated successfully!" });
      } else {
        setAccountsMsg({ type: "error", text: data.error || "Failed to update payment accounts" });
      }
    } catch {
      setAccountsMsg({ type: "error", text: "Network error saving payment accounts" });
    } finally {
      setIsSavingAccounts(false);
      setTimeout(() => setAccountsMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl font-black text-white">System Settings & CMS Controls</h2>
        <p className="text-xs text-[#aeaeae]">
          Control top announcement banner, mobile payment accounts, and master credentials.
        </p>
      </div>

      {/* ================= 1. TOP RUNNING ANNOUNCEMENT BAR CMS ================= */}
      <div className="p-6 rounded-3xl bg-[#140b1c] border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Megaphone className="size-5 text-[#f53b70]" />
            <div>
              <h3 className="text-sm font-black text-white">Top Running Announcement Bar ("Patti")</h3>
              <p className="text-[11px] text-[#aeaeae]">Live flash deal banner visible across the entire website.</p>
            </div>
          </div>
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <span className="text-[11px] font-bold text-[#aeaeae]">
              {announcement.enabled ? "Active (ON)" : "Hidden (OFF)"}
            </span>
            <input
              type="checkbox"
              checked={announcement.enabled}
              onChange={(e) => setAnnouncement({ ...announcement, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-white/10 peer-checked:bg-emerald-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all relative"></div>
          </label>
        </div>

        {/* Live Preview Box */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-[#aeaeae] font-bold uppercase tracking-wider block">Live Website Preview:</span>
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
            <div className="bg-gradient-to-r from-[#e11d48] via-[#a855f7] to-[#f59e0b] px-3.5 py-2 text-white flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center space-x-2 truncate">
                {announcement.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-black/30 border border-white/20 text-[10px] font-black uppercase text-yellow-300">
                    {announcement.badge}
                  </span>
                )}
                <span className="truncate">{announcement.text || "Announcement text goes here..."}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold shrink-0">
                Unlock Now →
              </span>
            </div>
          </div>
        </div>

        {announcementMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
              announcementMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {announcementMsg.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{announcementMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveAnnouncement} className="space-y-3 text-xs pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[#aeaeae] block mb-1 font-bold">Badge Text</label>
              <input
                type="text"
                value={announcement.badge || ""}
                onChange={(e) => setAnnouncement({ ...announcement, badge: e.target.value })}
                placeholder="e.g. FLASH DEAL 🔥"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[#aeaeae] block mb-1 font-bold">Announcement Text *</label>
              <input
                type="text"
                required
                value={announcement.text}
                onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
                placeholder="e.g. VIP Elite Plan 50% Off — Tap to unlock 18+ Uncensored Chat 💕"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingAnnouncement}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:brightness-110 active:scale-98 text-white font-black text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Save className="size-3.5" />
            <span>{isSavingAnnouncement ? "Saving Patti..." : "Save Announcement Bar"}</span>
          </button>
        </form>
      </div>

      {/* ================= 2. PAYMENT ACCOUNTS CMS ================= */}
      <div className="p-6 rounded-3xl bg-[#140b1c] border border-white/5 space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-white/10">
          <Smartphone className="size-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-black text-white">Payment Accounts CMS (Mobile Numbers)</h3>
            <p className="text-[11px] text-[#aeaeae]">Update your EasyPaisa, JazzCash, and NayaPay numbers anytime.</p>
          </div>
        </div>

        {accountsMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
              accountsMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {accountsMsg.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{accountsMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSavePaymentAccounts} className="space-y-4 text-xs">
          {/* EasyPaisa */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2">
            <span className="font-bold text-emerald-400 block text-xs">🟢 EasyPaisa Account</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[#aeaeae] block mb-0.5 text-[11px]">Mobile Number</label>
                <input
                  type="text"
                  value={paymentAccounts.easypaisa?.number || ""}
                  onChange={(e) =>
                    setPaymentAccounts({
                      ...paymentAccounts,
                      easypaisa: { ...paymentAccounts.easypaisa, number: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-[#aeaeae] block mb-0.5 text-[11px]">Account Title</label>
                <input
                  type="text"
                  value={paymentAccounts.easypaisa?.title || ""}
                  onChange={(e) =>
                    setPaymentAccounts({
                      ...paymentAccounts,
                      easypaisa: { ...paymentAccounts.easypaisa, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* JazzCash */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-red-500/20 space-y-2">
            <span className="font-bold text-red-400 block text-xs">🔴 JazzCash Account</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[#aeaeae] block mb-0.5 text-[11px]">Mobile Number</label>
                <input
                  type="text"
                  value={paymentAccounts.jazzcash?.number || ""}
                  onChange={(e) =>
                    setPaymentAccounts({
                      ...paymentAccounts,
                      jazzcash: { ...paymentAccounts.jazzcash, number: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-red-400"
                />
              </div>
              <div>
                <label className="text-[#aeaeae] block mb-0.5 text-[11px]">Account Title</label>
                <input
                  type="text"
                  value={paymentAccounts.jazzcash?.title || ""}
                  onChange={(e) =>
                    setPaymentAccounts({
                      ...paymentAccounts,
                      jazzcash: { ...paymentAccounts.jazzcash, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-red-400"
                />
              </div>
            </div>
          </div>

          {/* NayaPay */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-orange-500/20 space-y-2">
            <span className="font-bold text-orange-400 block text-xs">🟠 NayaPay Wallet</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[#aeaeae] block mb-0.5 text-[11px]">Mobile Number / ID</label>
                <input
                  type="text"
                  value={paymentAccounts.nayapay?.number || ""}
                  onChange={(e) =>
                    setPaymentAccounts({
                      ...paymentAccounts,
                      nayapay: { ...paymentAccounts.nayapay, number: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-[#aeaeae] block mb-0.5 text-[11px]">Account Title</label>
                <input
                  type="text"
                  value={paymentAccounts.nayapay?.title || ""}
                  onChange={(e) =>
                    setPaymentAccounts({
                      ...paymentAccounts,
                      nayapay: { ...paymentAccounts.nayapay, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Binance */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-yellow-500/20 space-y-2">
            <span className="font-bold text-yellow-400 block text-xs">🟡 Binance Pay ID (Crypto / USDT)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[#aeaeae] block mb-0.5 text-[11px]">Pay ID</label>
                <input
                  type="text"
                  value={paymentAccounts.binance?.number || ""}
                  onChange={(e) =>
                    setPaymentAccounts({
                      ...paymentAccounts,
                      binance: { ...paymentAccounts.binance, number: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="text-[#aeaeae] block mb-0.5 text-[11px]">Label</label>
                <input
                  type="text"
                  value={paymentAccounts.binance?.title || ""}
                  onChange={(e) =>
                    setPaymentAccounts({
                      ...paymentAccounts,
                      binance: { ...paymentAccounts.binance, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingAccounts}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 active:scale-98 text-white font-black text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Save className="size-3.5" />
            <span>{isSavingAccounts ? "Saving Accounts..." : "Save Payment Account Numbers"}</span>
          </button>
        </form>
      </div>

      {/* ================= 3. MASTER ACCESS CREDENTIALS ================= */}
      <div className="p-6 rounded-3xl bg-[#140b1c] border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Lock className="size-5 text-[#f53b70]" />
            <div>
              <h3 className="text-sm font-black text-white">Change Master Password</h3>
              <p className="text-[11px] text-[#aeaeae]">Update the master password used to log in to this Admin Panel.</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10">
            <span className="text-[10px] text-[#aeaeae]">Active:</span>
            <span className="font-mono text-amber-400 text-[11px]">
              {showPasswordDetails ? activeMasterPassword : "••••••••••••"}
            </span>
            <button
              type="button"
              onClick={() => setShowPasswordDetails(!showPasswordDetails)}
              className="text-[#aeaeae] hover:text-white ml-1 cursor-pointer"
              title={showPasswordDetails ? "Hide password" : "Show active password"}
            >
              {showPasswordDetails ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            </button>
          </div>
        </div>

        {passwordStatusMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
              passwordStatusMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {passwordStatusMsg.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{passwordStatusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
          <div>
            <label className="text-[#aeaeae] block mb-1 font-bold">Current Master Password</label>
            <input
              type="password"
              required
              value={currentMasterPassword}
              onChange={(e) => setCurrentMasterPassword(e.target.value)}
              placeholder="Enter current password (e.g. #Abdullah786099#)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-[#f53b70]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[#aeaeae] block mb-1 font-bold">New Master Password</label>
              <input
                type="password"
                required
                value={newMasterPassword}
                onChange={(e) => setNewMasterPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-[#f53b70]"
              />
            </div>
            <div>
              <label className="text-[#aeaeae] block mb-1 font-bold">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmMasterPassword}
                onChange={(e) => setConfirmMasterPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-[#f53b70]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f53b70] via-[#ff5b8c] to-[#8b5cf6] text-white font-extrabold text-xs shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 mt-2 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Lock className="size-3.5" />
            <span>
              {isUpdatingPassword ? "Updating Password..." : "Save New Master Password 🔐"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
