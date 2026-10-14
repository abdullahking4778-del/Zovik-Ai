"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Coins,
  Sparkles,
  Check,
  Copy,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  UploadCloud,
  FileCheck,
  Clock,
  Flame,
  Star,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWallet, notifyWalletUpdated } from "@/hooks/useWallet";
import { calculateCoins } from "@/lib/wallet/economyConfig";

interface CoinStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaymentAccount {
  name: string;
  account: string;
  title: string;
  notes: string;
  badge?: string;
  isActive?: boolean;
}

const DEFAULT_ACCOUNTS: Record<string, PaymentAccount> = {
  easypaisa: {
    name: "EasyPaisa",
    account: "Loading...",
    title: "Official Account",
    notes: "EasyPaisa App se Send Money karein. 11-digit Trx ID copy kar ke paste karein.",
    badge: "INSTANT 🇵🇰",
    isActive: true,
  },
  jazzcash: {
    name: "JazzCash",
    account: "Loading...",
    title: "Official Account",
    notes: "JazzCash App ya *786# se transfer karein. Transaction ID (TID) copy karein.",
    badge: "FAST 🇵🇰",
    isActive: true,
  },
  nayapay: {
    name: "NayaPay",
    account: "Loading...",
    title: "Official Account",
    notes: "NayaPay mobile number ya NayaPay ID par transfer karein.",
    badge: "0% FEE 🇵🇰",
    isActive: true,
  },
  binance: {
    name: "Binance Pay (USDT)",
    account: "Loading...",
    title: "Official Pay ID",
    notes: "Binance App → Pay → Send to Official Pay ID. Paste Order / Pay ID below.",
    badge: "CRYPTO 🌐",
    isActive: true,
  },
};

export default function CoinStoreModal({ isOpen, onClose }: CoinStoreModalProps) {
  const { user, isLocallyLoggedIn } = useAuth();
  const { balance, economy, refreshWallet } = useWallet();

  const [accounts, setAccounts] = useState<Record<string, PaymentAccount>>(DEFAULT_ACCOUNTS);
  const [currency, setCurrency] = useState<"PKR" | "USDT">("PKR");
  const [selectedPackId, setSelectedPackId] = useState<string>("pack_1000");
  const [customAmount, setCustomAmount] = useState<string>("500");
  const [showCheckout, setShowCheckout] = useState(false);

  // Checkout inputs
  const [userEmail, setUserEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"easypaisa" | "jazzcash" | "nayapay" | "binance">("easypaisa");
  const [trxId, setTrxId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Live fetch payment receiving accounts from server
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/payment-accounts")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.accounts) {
          const merged: Record<string, PaymentAccount> = { ...DEFAULT_ACCOUNTS };
          for (const [key, val] of Object.entries(data.accounts as Record<string, any>)) {
            if (val && typeof val === "object") {
              merged[key] = {
                name: val.name || merged[key]?.name || key,
                account: val.number || val.account || merged[key]?.account || "",
                title: val.title || merged[key]?.title || "",
                notes: val.instructions || val.notes || merged[key]?.notes || "",
                badge: val.badge || merged[key]?.badge || "LIVE 🇵🇰",
                isActive: val.isActive !== false,
              };
            }
          }
          setAccounts(merged);
        }
      })
      .catch((err) => console.warn("[CoinStoreModal] Live accounts fetch note:", err));
  }, [isOpen]);

  // Packages from economy config or sensible defaults
  const packages = economy?.packages && economy.packages.length > 0 ? economy.packages : [
    { id: "pack_50", coins: 50, bonusCoins: 0, totalCoins: 50, pricePKR: 50, label: "Starter", badge: "MIN 50" },
    { id: "pack_200", coins: 200, bonusCoins: 0, totalCoins: 200, pricePKR: 200, label: "Popular", badge: "POPULAR 🔥", isPopular: true },
    { id: "pack_1000", coins: 1000, bonusCoins: 50, totalCoins: 1050, pricePKR: 1000, label: "Best Value", badge: "+50 BONUS 🎁" },
    { id: "pack_5000", coins: 5000, bonusCoins: 500, totalCoins: 5500, pricePKR: 5000, label: "VIP Diamond", badge: "+500 BONUS 💎" },
    { id: "pack_50000", coins: 50000, bonusCoins: 10000, totalCoins: 60000, pricePKR: 50000, label: "Whale Unlimited", badge: "+10K BONUS 👑" },
  ];

  const usdtRate = economy?.usdtRate || 280;

  // Selected package details
  let activeCoins = 1000;
  let activeBonus = 50;
  let activeTotal = 1050;
  let activePricePKR = 1000;
  let activePriceUSDT = Number((1000 / usdtRate).toFixed(2));

  if (selectedPackId === "custom") {
    const parsedNum = Math.max(50, parseInt(customAmount.replace(/[^0-9]/g, "") || "50", 10));
    const calc = calculateCoins(parsedNum, currency);
    activeCoins = calc.coins;
    activeBonus = calc.bonusCoins;
    activeTotal = calc.totalCoins;
    activePricePKR = calc.pricePKR;
    activePriceUSDT = calc.priceUSDT;
  } else {
    const matched = packages.find((p) => p.id === selectedPackId) || packages[2];
    activeCoins = matched.coins;
    activeBonus = matched.bonusCoins || 0;
    activeTotal = matched.totalCoins || matched.coins + activeBonus;
    activePricePKR = matched.pricePKR;
    activePriceUSDT = Number((matched.pricePKR / usdtRate).toFixed(2));
  }

  // Handle Slip Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid screenshot image.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1000;
        const scaleSize = MAX_WIDTH / Math.max(img.width, MAX_WIDTH);
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setScreenshotData(canvas.toDataURL("image/jpeg", 0.75));
      };
    };
    reader.readAsDataURL(file);
  };

  // Copy Account Number
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToUse = userEmail.trim() || user?.email || "";
    if (!emailToUse || !trxId.trim()) {
      alert("Please provide your account email and Transaction ID!");
      return;
    }

    setIsSubmitting(true);
    try {
      const activeMethod = accounts[paymentMethod] || DEFAULT_ACCOUNTS[paymentMethod] || {
        name: paymentMethod,
        account: "",
        title: "",
        notes: "",
      };
      const amountStr = currency === "PKR" ? `Rs. ${activePricePKR.toLocaleString()}` : `$${activePriceUSDT}`;

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "",
          userEmail: emailToUse,
          plan: selectedPackId,
          planName: `${activeTotal.toLocaleString()} Coins Pack`,
          coins: activeTotal,
          currency,
          amount: currency === "PKR" ? activePricePKR : activePriceUSDT,
          method: activeMethod.name,
          trxId: trxId.trim(),
          senderName: senderName.trim(),
          screenshot: screenshotData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitSuccess(true);
        notifyWalletUpdated();
      } else {
        alert(data.error || "Submission failed. Please try again.");
      }
    } catch {
      alert("Network error submitting receipt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-2xl animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#180f24] via-[#100817] to-[#0a050e] border border-amber-500/20 rounded-3xl p-5 sm:p-8 shadow-2xl text-white my-8 overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/4 -mr-20 -mt-20 size-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -ml-20 -mb-20 size-72 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#aeaeae] hover:text-white transition-colors z-20"
        >
          <X className="size-5" />
        </button>

        {!showCheckout ? (
          /* ================= VIEW 1: COIN PACKAGES SELECTION ================= */
          <div className="flex flex-col items-center text-center relative z-10">
            {/* Header Badge */}
            <div className="flex items-center space-x-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-3 shadow-md shadow-amber-500/10">
              <Coins className="size-3.5" />
              <span>Official Coin Store • 1 PKR = 1 Coin</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              Get Coins & Talk Without Limits
            </h2>

            <p className="text-xs text-[#aeaeae] max-w-md mb-4">
              Pay as you go! Minimum purchase sirf 50 coins (Rs. 50). Jitna chaho utna chat aur exclusive private HD photos enjoy karo.
            </p>

            {/* Active Balance Pill */}
            {(user || isLocallyLoggedIn) && (
              <div className="flex items-center space-x-2 px-4 py-1.5 rounded-2xl bg-black/50 border border-amber-500/30 text-xs font-black text-amber-300 mb-6 shadow-inner">
                <span className="text-white/60 font-semibold">Your Balance:</span>
                <span className="text-base text-amber-400">🪙 {balance.toLocaleString()} Coins</span>
              </div>
            )}

            {/* Currency Toggle */}
            <div className="flex items-center p-1 rounded-2xl bg-black/60 border border-white/10 mb-6 shadow-inner">
              <button
                type="button"
                onClick={() => setCurrency("PKR")}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                  currency === "PKR"
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/30"
                    : "text-[#aeaeae] hover:text-white"
                }`}
              >
                <span>🇵🇰 PKR (Rs)</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USDT")}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                  currency === "USDT"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/30"
                    : "text-[#aeaeae] hover:text-white"
                }`}
              >
                <span>🌐 USDT ($)</span>
              </button>
            </div>

            {/* Packages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left mb-6">
              {packages.map((pkg) => {
                const isSelected = selectedPackId === pkg.id;
                const bonus = pkg.bonusCoins || 0;
                const total = pkg.totalCoins || pkg.coins + bonus;
                const priceUSDT = Number((pkg.pricePKR / usdtRate).toFixed(2));

                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackId(pkg.id)}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-gradient-to-br from-[#2a1738] to-[#170e24] border-amber-400 shadow-xl shadow-amber-500/10 scale-[1.01]"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Badge */}
                    {pkg.badge && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[9px] font-black uppercase tracking-wider shadow-sm">
                        {pkg.badge}
                      </span>
                    )}

                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xl">🪙</span>
                      <h4 className="text-lg font-black text-white">
                        {total.toLocaleString()} Coins
                      </h4>
                    </div>

                    {bonus > 0 && (
                      <p className="text-[11px] text-amber-300 font-bold mb-1">
                        Includes +{bonus.toLocaleString()} Free Bonus Coins!
                      </p>
                    )}

                    <p className="text-xs text-[#aeaeae] mb-3">
                      {pkg.description || `${pkg.coins} Chat msgs or HD Photos`}
                    </p>

                    <div className="flex items-baseline space-x-2">
                      <span className="text-lg font-black text-white">
                        {currency === "PKR" ? `Rs. ${pkg.pricePKR.toLocaleString()}` : `$${priceUSDT} USDT`}
                      </span>
                      {currency === "USDT" && (
                        <span className="text-[10px] text-white/40 font-mono">
                          (Rs. {pkg.pricePKR.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* CUSTOM AMOUNT CARD */}
              <div
                onClick={() => setSelectedPackId("custom")}
                className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
                  selectedPackId === "custom"
                    ? "bg-gradient-to-br from-[#2a1738] to-[#170e24] border-amber-400 shadow-xl shadow-amber-500/10 scale-[1.01]"
                    : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20"
                }`}
              >
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/10 text-white text-[9px] font-black uppercase tracking-wider">
                  UNLIMITED ♾️
                </span>

                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">✨</span>
                  <h4 className="text-lg font-black text-white">Custom Amount</h4>
                </div>

                <p className="text-xs text-[#aeaeae] mb-2">
                  Enter any PKR or USDT amount (Min 50 PKR).
                </p>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-amber-400">
                    {currency === "PKR" ? "Rs." : "$"}
                  </span>
                  <input
                    type="number"
                    min="50"
                    step="1"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedPackId("custom");
                    }}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/20 text-white text-xs font-bold focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Feature Usage Rates Guide */}
            <div className="w-full p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 mb-6 text-left">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-black block mb-2">
                Coins Usage Guide (Cost Per Action)
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-xs block font-black text-white">💬 1 Coin</span>
                  <span className="text-[10px] text-[#888]">1 AI Message</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-xs block font-black text-amber-400">📸 5 Coins</span>
                  <span className="text-[10px] text-[#888]">1 HD Photo</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-xs block font-black text-pink-400">🎨 100 Coins</span>
                  <span className="text-[10px] text-[#888]">Custom Companion</span>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              type="button"
              onClick={() => setShowCheckout(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:brightness-110 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all transform active:scale-95"
            >
              <span>Continue to Payment ({currency === "PKR" ? `Rs. ${activePricePKR.toLocaleString()}` : `$${activePriceUSDT} USDT`})</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        ) : (
          /* ================= VIEW 2: CHECKOUT & PAYMENT PROOF ================= */
          <div className="flex flex-col relative z-10 text-left">
            {/* Back button */}
            <button
              onClick={() => {
                if (submitSuccess) {
                  onClose();
                  setSubmitSuccess(false);
                } else {
                  setShowCheckout(false);
                }
              }}
              className="text-xs text-[#aeaeae] hover:text-white mb-4 flex items-center space-x-1 font-bold"
            >
              <span>← Back to Packages</span>
            </button>

            {submitSuccess ? (
              /* Success Screen */
              <div className="flex flex-col items-center text-center py-8 space-y-4">
                <div className="size-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="text-2xl font-black text-white">Payment Proof Submitted!</h3>
                <p className="text-xs text-[#aeaeae] max-w-sm">
                  Shukriya! Aapka Transaction ID aur receipt screenshot review ke liye receive ho chuka hai. Admin receipt verify kar ke chand minutes mein aapke wallet mein <span className="text-amber-400 font-bold">{activeTotal.toLocaleString()} Coins</span> credit kar dega.
                </p>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 w-full max-w-sm text-left text-xs font-mono">
                  <p className="text-white/60">Account: <span className="text-white font-bold">{userEmail}</span></p>
                  <p className="text-white/60">Coins Pack: <span className="text-amber-400 font-bold">{activeTotal.toLocaleString()} Coins</span></p>
                  <p className="text-white/60">Status: <span className="text-yellow-400 font-bold">Pending Review ⏳</span></p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    setSubmitSuccess(false);
                    setShowCheckout(false);
                  }}
                  className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                >
                  Done & Back to Chat
                </button>
              </div>
            ) : (
              /* Checkout Form */
              <form onSubmit={handleSubmitPayment} className="space-y-5">
                {/* Order Summary Pill */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div>
                    <span className="text-[10px] text-amber-300 font-black uppercase tracking-wider block">Selected Package</span>
                    <h4 className="text-base font-black text-white">🪙 {activeTotal.toLocaleString()} Coins</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/40 block">Amount to Pay</span>
                    <span className="text-lg font-black text-amber-400">
                      {currency === "PKR" ? `Rs. ${activePricePKR.toLocaleString()}` : `$${activePriceUSDT} USDT`}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-white mb-2">Select Payment Method</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(accounts)
                      .filter(([_, acc]) => acc.isActive !== false)
                      .map(([key, acc]) => {
                        const isSelected = paymentMethod === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setPaymentMethod(key as any)}
                            className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all border ${
                              isSelected
                                ? "bg-white/15 border-amber-400 text-white shadow-md shadow-amber-500/10"
                                : "bg-white/5 border-white/5 text-[#aeaeae] hover:text-white"
                            }`}
                          >
                            <span className="text-[9px] text-amber-400 block font-mono">{acc.badge || "ACTIVE"}</span>
                            <span className="block mt-0.5">{acc.name}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Account Details Box */}
                {(() => {
                  const currentAccount = accounts[paymentMethod] || DEFAULT_ACCOUNTS[paymentMethod];
                  return (
                    <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-white/40 uppercase font-mono block">
                            {paymentMethod === "binance" ? "Binance Pay ID / Account" : "Account / Wallet Number"}
                          </span>
                          <p className="text-base font-black text-white font-mono select-all">
                            {currentAccount?.account || "N/A"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentAccount?.account || "")}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all"
                        >
                          {copiedAccount ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          <span>{copiedAccount ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-white/5 text-xs text-[#aeaeae] flex flex-wrap items-center justify-between gap-1">
                        <div>
                          <span className="text-white/60 font-semibold">Account Title / Name: </span>
                          <span className="text-amber-400 font-black">{currentAccount?.title || "N/A"}</span>
                        </div>
                        {paymentMethod === "binance" && currentAccount?.account && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black border border-amber-500/30">
                            ID: {currentAccount.account} ({currentAccount.title || "Binance"})
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-white/50 italic pt-1">
                        {currentAccount?.notes || ""}
                      </p>
                    </div>
                  );
                })()}

                {/* Form Fields: Email & Trx ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1">
                      Recipient Email (Coins Delivery)
                    </label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1">Transaction ID (Trx ID / TID)</label>
                    <input
                      type="text"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      placeholder="e.g. 29384758192"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                {/* Screenshot Upload */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">Upload Payment Slip / Screenshot</label>
                  <label className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-dashed border-white/20 hover:border-amber-400 cursor-pointer transition-all">
                    {screenshotData ? (
                      <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                        <FileCheck className="size-5" />
                        <span>Screenshot attached successfully! (Click to replace)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-1 text-center">
                        <UploadCloud className="size-6 text-amber-400" />
                        <span className="text-xs font-bold text-white">Upload receipt screenshot</span>
                        <span className="text-[10px] text-[#888]">JPG or PNG screenshot from EasyPaisa / JazzCash / Binance</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:brightness-110 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting Payment Proof..." : "Submit Payment Proof 🚀"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
