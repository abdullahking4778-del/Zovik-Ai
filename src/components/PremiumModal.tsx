"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Crown,
  Sparkles,
  Zap,
  Image as ImageIcon,
  MessageCircle,
  Phone,
  ShieldCheck,
  Copy,
  CheckCircle2,
  Lock,
  Star,
  Flame,
  UploadCloud,
  FileCheck,
  Clock,
} from "lucide-react";
import { PricingPlan } from "@/types";

const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: "plus",
    name: "Plus Plan",
    badge: "70% OFF",
    badgeColor: "orange",
    pricePKR: 1400,
    originalPricePKR: 4600,
    priceUSD: 5,
    originalPriceUSD: 16.99,
    durationDays: 30,
    features: [
      "200 Messages / day (24h Reset)",
      "10 HD Photos / day",
      "18+ Unfiltered AI Roleplay & Chat",
      "18+ Uncensored HD Photos",
      "Voice Notes Unlocked",
      "30 Days Cloud Storage Retention",
    ],
    isPopular: false,
    isActive: true,
  },
  {
    id: "vip",
    name: "VIP Elite",
    badge: "BEST VALUE 🔥",
    badgeColor: "pink",
    pricePKR: 3000,
    originalPricePKR: 10000,
    priceUSD: 12,
    originalPriceUSD: 39.99,
    durationDays: 30,
    features: [
      "Unlimited Messages / Day (No Limits)",
      "30 HD Photos / day (Exclusive Poses)",
      "VIP Uncensored Secret Content",
      "Ultra-Fast AI Model Priority",
      "Live HD Voice Calls & Audio",
      "Lifetime VIP Badge on Profile",
    ],
    isPopular: true,
    isActive: true,
  },
  {
    id: "vip_plus",
    name: "VIP Plus Diamond",
    badge: "EXCLUSIVE 💎",
    badgeColor: "purple",
    pricePKR: 4500,
    originalPricePKR: 15000,
    priceUSD: 18,
    originalPriceUSD: 59.99,
    durationDays: 60,
    features: [
      "2 Months Full VIP Access (Save 35%)",
      "Unlimited Messages & Voice Calls",
      "50 HD Photos / Day (Instant Generation)",
      "Custom Companion Creation Unlocked",
      "Direct 1-on-1 VIP Support Priority",
      "Diamond VIP Badge on Profile",
    ],
    isPopular: false,
    isActive: true,
  },
];

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const [currency, setCurrency] = useState<"PKR" | "USD">("PKR");
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<string>("vip");
  const [showCheckout, setShowCheckout] = useState(false);

  // Checkout form fields
  const [userEmail, setUserEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"easypaisa" | "jazzcash" | "nayapay" | "binance">("easypaisa");
  const [trxId, setTrxId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [currentEmail, setCurrentEmail] = useState("");

  const [paymentAccounts, setPaymentAccounts] = useState<Record<string, { name: string; label: string; number: string; title: string; instructions: string }>>({
    easypaisa: {
      name: "EasyPaisa",
      label: "EasyPaisa Mobile Account",
      number: "03427646038",
      title: "AMINA AKRAM",
      instructions: "Transfer the amount via EasyPaisa App. Enter your 11-digit Transaction ID (Trx ID) and attach payment receipt below.",
    },
    jazzcash: {
      name: "JazzCash",
      label: "JazzCash Mobile Account",
      number: "03154761082",
      title: "AMINA AKRAM",
      instructions: "Transfer the amount via JazzCash App or *786#. Enter your Transaction ID (TID) and attach payment receipt below.",
    },
    nayapay: {
      name: "NayaPay",
      label: "NayaPay Wallet / ID",
      number: "0317 6127513",
      title: "ABDULLAH MAHMOOD",
      instructions: "Transfer to NayaPay Mobile Number / NayaPay ID. Enter your Transaction Reference ID below.",
    },
    binance: {
      name: "Binance Pay",
      label: "Binance Pay ID (USDT)",
      number: "1204011189",
      title: "Binance Pay ID",
      instructions: "Open Binance App → Go to Pay → Send via Pay ID (1204011189) → Transfer $5 (Plus) or $12 (VIP) USDT. Paste your Order / Pay ID below.",
    },
  });

  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem("zovik_user");
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed?.email) {
          setCurrentEmail(parsed.email);
        }
      }
    } catch (e) {
      console.warn("Failed to parse user session in PremiumModal:", e);
    }

    // Fetch dynamic pricing plans from API
    let isMounted = true;
    fetch("/api/plans", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(data.plans);
          setSelectedPlan((prev) => {
            if (data.plans.some((p: PricingPlan) => p.id === prev)) return prev;
            const popular = data.plans.find((p: PricingPlan) => p.isPopular);
            return popular ? popular.id : data.plans[0].id;
          });
        }
      })
      .catch((err) => {
        console.warn("Could not load dynamic pricing plans, using defaults:", err);
      });

    // Fetch dynamic payment accounts from API
    fetch("/api/payment-accounts", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.accounts) {
          setPaymentAccounts((prev) => ({ ...prev, ...data.accounts }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const activePlanObj =
    plans.find((p) => p.id === selectedPlan) || plans[0] || DEFAULT_PLANS[1];

  if (!isOpen) return null;

  // Payment credentials provided dynamically by admin
  const paymentDetails = {
    easypaisa: paymentAccounts.easypaisa || {
      name: "EasyPaisa",
      label: "EasyPaisa Mobile Account",
      number: "03427646038",
      title: "AMINA AKRAM",
      instructions: "Transfer the amount via EasyPaisa App. Enter your 11-digit Transaction ID (Trx ID) and attach payment receipt below.",
    },
    jazzcash: paymentAccounts.jazzcash || {
      name: "JazzCash",
      label: "JazzCash Mobile Account",
      number: "03154761082",
      title: "AMINA AKRAM",
      instructions: "Transfer the amount via JazzCash App or *786#. Enter your Transaction ID (TID) and attach payment receipt below.",
    },
    nayapay: paymentAccounts.nayapay || {
      name: "NayaPay",
      label: "NayaPay Wallet / ID",
      number: "0317 6127513",
      title: "ABDULLAH MAHMOOD",
      instructions: "Transfer to NayaPay Mobile Number / NayaPay ID. Enter your Transaction Reference ID below.",
    },
    binance: paymentAccounts.binance || {
      name: "Binance Pay",
      label: "Binance Pay ID (USDT)",
      number: "1204011189",
      title: "Binance Pay ID",
      instructions: "Open Binance App → Go to Pay → Send via Pay ID (1204011189) → Transfer $5 (Plus) or $12 (VIP) USDT. Paste your Order / Pay ID below.",
    },
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size should be under 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToUse = userEmail.trim() || currentEmail;
    if (!emailToUse || !trxId.trim()) {
      alert("Please provide your account email and Transaction ID!");
      return;
    }

    setIsSubmitting(true);
    try {
      const activeMethod = paymentDetails[paymentMethod];
      const amountStr =
        currency === "PKR"
          ? `Rs. ${activePlanObj.pricePKR.toLocaleString()}`
          : `$${activePlanObj.priceUSD}`;

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: emailToUse,
          plan: selectedPlan,
          currency,
          amount: amountStr,
          method: activeMethod.name,
          trxId: trxId.trim(),
          senderName: senderName.trim(),
          screenshot: screenshotData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitSuccess(true);
      } else {
        alert(data.error || "Submission failed. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#180f24] via-[#100817] to-[#0a050e] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl text-white my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#aeaeae] hover:text-white transition-colors"
        >
          <X className="size-5" />
        </button>

        {!showCheckout ? (
          /* ================= VIEW 1: PLAN SELECTION ================= */
          <div className="flex flex-col items-center text-center">
            {/* Trust Header */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#f53b70]/20 border border-[#f53b70]/40 text-[#f53b70] text-xs font-bold mb-3">
              <Sparkles className="size-3.5" />
              <span>Choose your Plan</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
              Unlock Intimacy Without Limits
            </h2>

            <div className="flex items-center space-x-1 text-xs text-amber-400 font-semibold mb-6">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-3.5 fill-amber-400" />
                ))}
              </div>
              <span className="text-[#aeaeae]">Trusted by 50,000+ Active Users</span>
            </div>

            {/* Currency Switcher Toggle */}
            <div className="flex items-center p-1 rounded-2xl bg-black/50 border border-white/10 mb-6 shadow-inner">
              <button
                onClick={() => setCurrency("PKR")}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currency === "PKR"
                    ? "bg-[#f53b70] text-white shadow-md shadow-pink-600/30"
                    : "text-[#aeaeae] hover:text-white"
                }`}
              >
                <span>🇵🇰 PKR (Rs)</span>
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currency === "USD"
                    ? "bg-[#f53b70] text-white shadow-md shadow-pink-600/30"
                    : "text-[#aeaeae] hover:text-white"
                }`}
              >
                <span>🌐 USD ($)</span>
              </button>
            </div>

            {/* Dynamic Plans Comparison Grid */}
            <div className={`grid grid-cols-1 ${plans.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"} gap-4 w-full mb-6`}>
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isPopular = plan.isPopular;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative flex flex-col justify-between p-5 rounded-3xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? isPopular
                          ? "bg-gradient-to-b from-[#35133a] to-[#1c0824] border-[#f53b70] shadow-2xl shadow-pink-600/30 scale-[1.02]"
                          : "bg-gradient-to-b from-[#251333] to-[#160a21] border-[#f53b70] shadow-xl shadow-pink-600/20 scale-[1.02]"
                        : "bg-[#140b1c] border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Top Glow Badge for Popular Plan */}
                    {isPopular && (
                      <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black tracking-wider uppercase shadow-md flex items-center space-x-1">
                        <Flame className="size-3 fill-black" />
                        <span>BEST VALUE</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1.5">
                        {isPopular && <Crown className="size-4 text-amber-400" />}
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                          {plan.name}
                        </span>
                      </div>
                      {plan.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            plan.badgeColor === "pink"
                              ? "bg-[#f53b70] text-white"
                              : plan.badgeColor === "purple"
                              ? "bg-purple-600/30 border border-purple-500/50 text-purple-300"
                              : "bg-orange-500/20 border border-orange-500/40 text-orange-400"
                          }`}
                        >
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-white">
                          {currency === "PKR"
                            ? `Rs. ${plan.pricePKR.toLocaleString()}`
                            : `$${plan.priceUSD}`}
                        </span>
                        <span className="text-xs text-[#aeaeae]">
                          /{plan.durationDays >= 60 ? `${plan.durationDays}d` : "month"}
                        </span>
                      </div>
                      {plan.originalPricePKR && (
                        <span className="text-xs text-[#888] line-through">
                          {currency === "PKR"
                            ? `Rs. ${plan.originalPricePKR.toLocaleString()}`
                            : `$${plan.originalPriceUSD}`}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2 text-xs text-[#d5c7d0] mb-5 flex-1">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start space-x-2">
                          <Check className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => setShowCheckout(true)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white shadow-lg shadow-pink-600/30 hover:brightness-110"
                          : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                    >
                      {isSelected ? `Get ${plan.name}` : `Choose ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Guarantee Banner */}
            <div className="flex items-center justify-center space-x-2 text-xs text-[#aeaeae]">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>100% Private, Discrete & Instant Activation Guarantee</span>
            </div>
          </div>
        ) : submitSuccess ? (
          /* ================= VIEW 3: PROFESSIONAL ENGLISH SUCCESS CONFIRMATION ================= */
          <div className="flex flex-col items-center text-center py-8">
            <div className="size-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
              <Clock className="size-9" />
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase mb-3">
              <span>Verification Pending ⏳</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Payment Under Review
            </h3>

            <p className="text-xs sm:text-sm text-[#cbb6bf] max-w-md mb-6 leading-relaxed">
              Thank you! Your payment verification is currently under review. Once confirmed, your{" "}
              <strong className="text-white">
                {activePlanObj.name}
              </strong>{" "}
              membership will be automatically activated within a few minutes.
            </p>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-[#aeaeae] mb-6 max-w-sm w-full space-y-2 text-left">
              <div className="flex justify-between">
                <span>Selected Plan:</span>
                <strong className="text-white uppercase">{activePlanObj.name} ({activePlanObj.durationDays || 30} Days)</strong>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <strong className="text-white">{paymentDetails[paymentMethod].name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <strong className="text-white font-mono">{trxId}</strong>
              </div>
              <div className="flex justify-between">
                <span>Screenshot Attached:</span>
                <strong className={screenshotData ? "text-emerald-400" : "text-white/50"}>
                  {screenshotData ? "Yes (Attached ✓)" : "No"}
                </strong>
              </div>
            </div>

            <button
              onClick={() => {
                setSubmitSuccess(false);
                setShowCheckout(false);
                onClose();
              }}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white font-bold text-sm hover:brightness-110 shadow-lg shadow-pink-600/30 transition-all"
            >
              Return to Chat
            </button>
          </div>
        ) : (
          /* ================= VIEW 2: DIRECT PAYMENT CHECKOUT ================= */
          <div className="flex flex-col">
            <button
              onClick={() => setShowCheckout(false)}
              className="self-start text-xs text-[#aeaeae] hover:text-white mb-3"
            >
              ← Back to plans
            </button>

            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-lg font-black text-white">
                  Payment for {activePlanObj.name}
                </h3>
                <span className="text-xs text-[#aeaeae]">
                  Total:{" "}
                  <strong className="text-[#f53b70]">
                    {currency === "PKR"
                      ? `Rs. ${activePlanObj.pricePKR.toLocaleString()} PKR`
                      : `$${activePlanObj.priceUSD} USD`}
                  </strong>{" "}
                  ({activePlanObj.durationDays || 30} Days)
                </span>
              </div>
              {activePlanObj.badge && (
                <span className="px-2.5 py-1 rounded-full bg-[#f53b70]/20 border border-[#f53b70]/40 text-[#f53b70] text-xs font-black">
                  {activePlanObj.badge}
                </span>
              )}
            </div>

            {/* Select Payment Method Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {(["easypaisa", "jazzcash", "nayapay", "binance"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition-all ${
                    paymentMethod === method
                      ? "bg-[#f53b70] border-[#f53b70] text-white shadow-md shadow-pink-600/30"
                      : "bg-white/5 border-white/10 text-[#aeaeae] hover:bg-white/10"
                  }`}
                >
                  {paymentDetails[method].name}
                </button>
              ))}
            </div>

            {/* Active Account Details Box */}
            <div className="p-4 rounded-2xl bg-[#1d1127] border border-[#f53b70]/30 mb-4 text-left">
              <span className="text-[11px] text-[#f53b70] font-black uppercase tracking-wider block mb-1">
                Official {paymentDetails[paymentMethod].label}
              </span>

              <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/10 mb-2">
                <div>
                  <span className="text-[10px] text-[#aeaeae] block">
                    {paymentMethod === "binance" ? "Binance Pay ID" : "Account Number"}
                  </span>
                  <span className="text-base font-black text-white font-mono">
                    {paymentDetails[paymentMethod].number}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(paymentDetails[paymentMethod].number, "num")}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center space-x-1"
                >
                  {copiedKey === "num" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{copiedKey === "num" ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/10 mb-2">
                <div>
                  <span className="text-[10px] text-[#aeaeae] block">Account Title</span>
                  <span className="text-sm font-bold text-white">
                    {paymentDetails[paymentMethod].title}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(paymentDetails[paymentMethod].title, "title")}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center space-x-1"
                >
                  {copiedKey === "title" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{copiedKey === "title" ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <p className="text-[11px] text-[#cbb6bf] leading-tight">
                {paymentDetails[paymentMethod].instructions}
              </p>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-3 text-left">
              <div>
                <label className="text-xs font-bold text-[#aeaeae] block mb-1">
                  Your Account Email
                </label>
                <input
                  type="email"
                  required
                  value={userEmail || currentEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-[#666] focus:outline-none focus:border-[#f53b70]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#aeaeae] block mb-1">
                    Transaction ID / Trx ID / Ref # <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder="e.g. 28947291048"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-[#666] focus:outline-none focus:border-[#f53b70]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#aeaeae] block mb-1">
                    Sender Account Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Your account name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-[#666] focus:outline-none focus:border-[#f53b70]"
                  />
                </div>
              </div>

              {/* Payment Screenshot (SS) Upload Field */}
              <div>
                <label className="text-xs font-bold text-[#aeaeae] block mb-1">
                  Attach Payment Screenshot / Receipt (Recommended)
                </label>
                {!screenshotData ? (
                  <label className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-white/20 bg-black/30 hover:bg-black/50 cursor-pointer transition-colors group">
                    <UploadCloud className="size-6 text-[#f53b70] mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs text-[#aeaeae] font-medium">Click to select screenshot (PNG, JPG)</span>
                    <span className="text-[10px] text-white/40">Max 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="size-5 text-emerald-400" />
                      <span className="text-xs text-emerald-300 font-bold">Screenshot Attached ✓</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScreenshotData(null)}
                      className="text-xs text-red-400 hover:text-red-300 underline font-bold"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white font-extrabold text-sm shadow-xl shadow-pink-600/30 hover:brightness-110 transition-all flex items-center justify-center space-x-2 mt-4 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Verifying & Submitting...</span>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Submit Payment Proof for Verification</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
