"use client";

import React, { useState, useEffect } from "react";
import { PricingPlan } from "@/types";
import { CoinPackage, DEFAULT_PACKAGES } from "@/lib/wallet/economyConfig";
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Tag,
  DollarSign,
  Calendar,
  Coins,
  Flame,
  RotateCcw,
  Save,
  TrendingUp,
} from "lucide-react";

interface AdminPlansTabProps {
  plans: PricingPlan[];
  onSavePlan: (plan: PricingPlan) => Promise<void> | void;
  onDeletePlan: (id: string) => Promise<void> | void;
}

export const AdminPlansTab: React.FC<AdminPlansTabProps> = ({
  plans,
  onSavePlan,
  onDeletePlan,
}) => {
  // Mode switcher: "coins" (Active Economy) or "subscriptions" (Legacy)
  const [activeMode, setActiveMode] = useState<"coins" | "subscriptions">("coins");

  // ================= COIN PACKAGES STATE =================
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>(DEFAULT_PACKAGES);
  const [usdtRate, setUsdtRate] = useState<number>(280);
  const [loadingEconomy, setLoadingEconomy] = useState(false);
  const [savingEconomy, setSavingEconomy] = useState(false);
  const [economyStatusMsg, setEconomyStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Coin Package Modal
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [editingCoinPack, setEditingCoinPack] = useState<CoinPackage | null>(null);
  const [packId, setPackId] = useState("");
  const [packLabel, setPackLabel] = useState("");
  const [packCoins, setPackCoins] = useState(1000);
  const [packBonusCoins, setPackBonusCoins] = useState(50);
  const [packPricePKR, setPackPricePKR] = useState(1000);
  const [packBadge, setPackBadge] = useState("");
  const [packBadgeColor, setPackBadgeColor] = useState("orange");
  const [packIsPopular, setPackIsPopular] = useState(false);
  const [packDescription, setPackDescription] = useState("");

  // ================= LEGACY SUBSCRIPTION PLANS STATE =================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formBadgeColor, setFormBadgeColor] = useState("orange");
  const [formPricePKR, setFormPricePKR] = useState(1500);
  const [formOriginalPricePKR, setFormOriginalPricePKR] = useState(3000);
  const [formPriceUSD, setFormPriceUSD] = useState(5);
  const [formDurationDays, setFormDurationDays] = useState(30);
  const [formDailyMessages, setFormDailyMessages] = useState<number>(500);
  const [formDailyPhotos, setFormDailyPhotos] = useState<number>(10);
  const [formFeatures, setFormFeatures] = useState("");
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load Economy Config on mount
  useEffect(() => {
    setLoadingEconomy(true);
    fetch("/api/admin/wallet", {
      headers: { "x-zovik-admin-request": "1" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.economy) {
          if (Array.isArray(data.economy.packages) && data.economy.packages.length > 0) {
            setCoinPackages(data.economy.packages);
          }
          if (data.economy.usdtRate) {
            setUsdtRate(data.economy.usdtRate);
          }
        }
      })
      .catch((err) => console.warn("[AdminPlansTab] Load economy config error:", err))
      .finally(() => setLoadingEconomy(false));
  }, []);

  // Save Economy Packages & USDT Rate to Server
  const persistEconomy = async (newPackages: CoinPackage[], newUsdtRate: number) => {
    setSavingEconomy(true);
    setEconomyStatusMsg(null);
    try {
      const res = await fetch("/api/admin/wallet", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-zovik-admin-request": "1",
        },
        body: JSON.stringify({
          packages: newPackages,
          usdtRate: newUsdtRate,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCoinPackages(data.economy.packages);
        setUsdtRate(data.economy.usdtRate);
        setEconomyStatusMsg({ type: "success", text: "Coin packages & exchange rates saved live! Instantly active on Coin Store." });
        setTimeout(() => setEconomyStatusMsg(null), 4000);
      } else {
        setEconomyStatusMsg({ type: "error", text: data.error || "Failed to save coin packages" });
      }
    } catch {
      setEconomyStatusMsg({ type: "error", text: "Network error saving coin packages" });
    } finally {
      setSavingEconomy(false);
    }
  };

  // Open Add Coin Package Modal
  const handleOpenAddCoinPack = () => {
    setEditingCoinPack(null);
    setPackId(`pack_${Date.now().toString().slice(-4)}`);
    setPackLabel("Special Offer Pack");
    setPackCoins(1000);
    setPackBonusCoins(100);
    setPackPricePKR(1000);
    setPackBadge("LIMITED OFFER 🔥");
    setPackBadgeColor("orange");
    setPackIsPopular(false);
    setPackDescription("Great value coin pack for voice calls & unhinged chats");
    setIsCoinModalOpen(true);
  };

  // Open Edit Coin Package Modal
  const handleOpenEditCoinPack = (pack: CoinPackage) => {
    setEditingCoinPack(pack);
    setPackId(pack.id);
    setPackLabel(pack.label);
    setPackCoins(pack.coins);
    setPackBonusCoins(pack.bonusCoins || 0);
    setPackPricePKR(pack.pricePKR);
    setPackBadge(pack.badge || "");
    setPackBadgeColor(pack.badgeColor || "orange");
    setPackIsPopular(Boolean(pack.isPopular));
    setPackDescription(pack.description || "");
    setIsCoinModalOpen(true);
  };

  // Submit Coin Package
  const handleSaveCoinPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packLabel.trim() || packPricePKR <= 0 || packCoins <= 0) {
      alert("Please fill in a valid pack label, coins, and price in PKR.");
      return;
    }

    const calculatedTotal = Number(packCoins) + Number(packBonusCoins || 0);
    const newPack: CoinPackage = {
      id: packId.trim() || `pack_${packCoins}`,
      label: packLabel.trim(),
      coins: Number(packCoins),
      bonusCoins: Number(packBonusCoins || 0),
      totalCoins: calculatedTotal,
      pricePKR: Number(packPricePKR),
      badge: packBadge.trim() || undefined,
      badgeColor: packBadgeColor,
      isPopular: packIsPopular,
      description: packDescription.trim() || `${calculatedTotal.toLocaleString()} Coins for voice notes, calls & chats`,
    };

    let updatedList: CoinPackage[];
    if (editingCoinPack) {
      updatedList = coinPackages.map((p) => (p.id === editingCoinPack.id ? newPack : p));
    } else {
      updatedList = [...coinPackages, newPack];
    }

    setIsCoinModalOpen(false);
    await persistEconomy(updatedList, usdtRate);
  };

  // Delete Coin Package
  const handleDeleteCoinPack = async (id: string) => {
    if (!confirm(`Are you sure you want to delete coin package '${id}'?`)) return;
    const updatedList = coinPackages.filter((p) => p.id !== id);
    await persistEconomy(updatedList, usdtRate);
  };

  // Reset Coin Packages to Factory Defaults
  const handleResetDefaults = async () => {
    if (!confirm("Reset coin packages to factory default 5 standard packs?")) return;
    await persistEconomy(DEFAULT_PACKAGES, 280);
  };

  // ================= LEGACY PLANS HANDLERS =================
  const handleOpenAdd = () => {
    setEditingPlan(null);
    setFormId("");
    setFormName("");
    setFormBadge("SPECIAL OFFER 🔥");
    setFormBadgeColor("pink");
    setFormPricePKR(1500);
    setFormOriginalPricePKR(3000);
    setFormPriceUSD(6);
    setFormDurationDays(30);
    setFormDailyMessages(500);
    setFormDailyPhotos(10);
    setFormFeatures("Unlimited Messages / Day\n20 HD Photos / Day\n18+ Uncensored Chat & Audio\nCloud Storage Retention");
    setFormIsPopular(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setFormId(plan.id);
    setFormName(plan.name);
    setFormBadge(plan.badge || "");
    setFormBadgeColor(plan.badgeColor || "orange");
    setFormPricePKR(plan.pricePKR);
    setFormOriginalPricePKR(plan.originalPricePKR || plan.pricePKR * 2);
    setFormPriceUSD(plan.priceUSD || 5);
    setFormDurationDays(plan.durationDays || 30);
    setFormDailyMessages(plan.dailyMessages ?? (plan.id === "plus" ? 200 : 500));
    setFormDailyPhotos(plan.dailyPhotos ?? (plan.id === "plus" ? 10 : 30));
    setFormFeatures(Array.isArray(plan.features) ? plan.features.join("\n") : "");
    setFormIsPopular(Boolean(plan.isPopular));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPricePKR) {
      alert("Plan name and price are required");
      return;
    }

    setIsSaving(true);
    try {
      const generatedId = formId.trim() || formName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const featuresList = formFeatures
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const planData: PricingPlan = {
        id: generatedId,
        name: formName.trim(),
        badge: formBadge.trim() || undefined,
        badgeColor: formBadgeColor,
        pricePKR: Number(formPricePKR),
        originalPricePKR: Number(formOriginalPricePKR),
        priceUSD: Number(formPriceUSD),
        originalPriceUSD: Number(formPriceUSD) * 2,
        durationDays: Number(formDurationDays),
        dailyMessages: Number(formDailyMessages) || 500,
        dailyPhotos: Number(formDailyPhotos) || 10,
        features: featuresList,
        isPopular: formIsPopular,
        isActive: true,
      };

      await onSavePlan(planData);
      setIsModalOpen(false);
    } catch {
      alert("Error saving plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-[#140b1c] border border-white/5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Coins className="size-5 text-amber-400" />
            <span>Coin Packages & Pricing CMS</span>
          </h2>
          <p className="text-xs text-[#aeaeae] mt-0.5">
            Manage 1 PKR = 1 Coin packages, bonus rewards, USDT conversion rate, or legacy membership offers.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-black/40 p-1 rounded-2xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveMode("coins")}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeMode === "coins"
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/20"
                : "text-[#aeaeae] hover:text-white"
            }`}
          >
            <Coins className="size-3.5" />
            <span>Coin Packages ({coinPackages.length})</span>
          </button>
          <button
            onClick={() => setActiveMode("subscriptions")}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeMode === "subscriptions"
                ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white shadow-md shadow-pink-600/20"
                : "text-[#aeaeae] hover:text-white"
            }`}
          >
            <Tag className="size-3.5" />
            <span>Legacy Plans ({plans.length})</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {economyStatusMsg && (
        <div
          className={`flex items-center space-x-2 p-3.5 rounded-2xl text-xs font-bold animate-fadeIn ${
            economyStatusMsg.type === "success"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-red-500/20 text-red-300 border border-red-500/30"
          }`}
        >
          {economyStatusMsg.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{economyStatusMsg.text}</span>
        </div>
      )}

      {/* ================= VIEW 1: COIN PACKAGES (PRIMARY) ================= */}
      {activeMode === "coins" && (
        <div className="space-y-6">
          {/* Top Controls: USDT Rate Bar & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-gradient-to-r from-[#191024] to-[#12081a] border border-amber-500/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="size-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <span className="text-[10px] text-amber-300 uppercase font-black tracking-wider block">
                  Crypto Exchange Rate
                </span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-sm font-bold text-white">1 USDT =</span>
                  <input
                    type="number"
                    min="1"
                    value={usdtRate}
                    onChange={(e) => setUsdtRate(Number(e.target.value))}
                    className="w-24 px-2.5 py-1 rounded-xl bg-black/50 border border-white/10 text-amber-400 font-mono font-black text-sm focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-xs text-white/60 font-bold">PKR</span>
                  <button
                    onClick={() => persistEconomy(coinPackages, usdtRate)}
                    disabled={savingEconomy}
                    className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all"
                  >
                    Save Rate
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetDefaults}
                disabled={savingEconomy}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#aeaeae] hover:text-white text-xs font-bold transition-all border border-white/5"
                title="Restore default 5 coin packs"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                onClick={handleOpenAddCoinPack}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black text-xs font-black shadow-md shadow-amber-500/20 transition-all active:scale-95"
              >
                <Plus className="size-4" />
                <span>Add Coin Package</span>
              </button>
            </div>
          </div>

          {/* Coin Packages Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {coinPackages.map((pack) => {
              const usdtPrice = Number((pack.pricePKR / usdtRate).toFixed(2));
              return (
                <div
                  key={pack.id}
                  className={`relative flex flex-col justify-between p-6 rounded-3xl border transition-all ${
                    pack.isPopular
                      ? "bg-gradient-to-b from-[#22152d] to-[#12081a] border-amber-500/60 shadow-xl shadow-amber-500/10"
                      : "bg-[#140b1c] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div>
                    {/* Header: ID & Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-[10px] text-[#888] uppercase bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
                        {pack.id}
                      </span>
                      {pack.badge && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            pack.badgeColor === "pink"
                              ? "bg-pink-500/20 text-[#f53b70] border border-pink-500/40"
                              : pack.badgeColor === "purple"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : pack.badgeColor === "amber"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                          }`}
                        >
                          {pack.badge}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-black text-white flex items-center space-x-1.5">
                      <span>{pack.label}</span>
                    </h3>

                    {/* Coins Big Display */}
                    <div className="my-3 p-3 rounded-2xl bg-black/40 border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#aeaeae]">Total Coins</span>
                        <div className="flex items-center space-x-1 text-xl font-black text-amber-400">
                          <Coins className="size-4" />
                          <span>{pack.totalCoins.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#888] mt-1 pt-1 border-t border-white/5">
                        <span>Base: {pack.coins.toLocaleString()}</span>
                        {pack.bonusCoins > 0 ? (
                          <span className="text-emerald-400 font-bold">+{pack.bonusCoins.toLocaleString()} Bonus 🎁</span>
                        ) : (
                          <span>0 Bonus</span>
                        )}
                      </div>
                    </div>

                    {/* Price in PKR & USDT */}
                    <div className="flex items-baseline space-x-2 mb-3">
                      <span className="text-2xl font-black text-white">
                        Rs. {pack.pricePKR.toLocaleString()}
                      </span>
                      <span className="text-xs text-amber-400 font-mono font-bold">
                        (${usdtPrice} USDT)
                      </span>
                    </div>

                    <p className="text-xs text-[#aeaeae] line-clamp-2 italic">
                      {pack.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-4 border-t border-white/5 mt-4">
                    <button
                      onClick={() => handleOpenEditCoinPack(pack)}
                      className="flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all active:scale-95"
                    >
                      <Edit3 className="size-3.5 text-amber-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteCoinPack(pack.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition-all active:scale-95"
                      title="Delete Coin Package"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: LEGACY SUBSCRIPTION PLANS ================= */}
      {activeMode === "subscriptions" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-3xl bg-[#140b1c] border border-white/5">
            <div>
              <span className="text-xs text-[#aeaeae]">Legacy Monthly Access Passes</span>
              <p className="text-[11px] text-[#666]">
                These are classic monthly subscription plans kept for backward compatibility with older user accounts.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white text-xs font-black shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all"
            >
              <Plus className="size-4" />
              <span>Add Legacy Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between p-6 rounded-3xl border transition-all ${
                  p.isPopular
                    ? "bg-gradient-to-b from-[#20102b] to-[#12081a] border-[#f53b70]/60 shadow-xl shadow-pink-600/10"
                    : "bg-[#140b1c] border-white/5 hover:border-white/10"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-[10px] text-[#888] uppercase bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
                      ID: {p.id}
                    </span>
                    {p.badge && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          p.badgeColor === "pink"
                            ? "bg-pink-500/20 text-[#f53b70] border border-pink-500/40"
                            : p.badgeColor === "purple"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                            : "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                        }`}
                      >
                        {p.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-white">{p.name}</h3>

                  <div className="my-3">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-black text-white">
                        Rs. {p.pricePKR.toLocaleString()}
                      </span>
                      <span className="text-xs text-[#aeaeae]">/ {p.durationDays} days</span>
                      <span className="text-xs text-emerald-400 font-bold">(${p.priceUSD})</span>
                    </div>
                    {p.originalPricePKR > p.pricePKR && (
                      <span className="text-xs text-[#888] line-through block mt-0.5">
                        Regular: Rs. {p.originalPricePKR.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2 text-xs text-[#d5c7d0] my-4 border-t border-white/5 pt-4">
                    {p.features?.map((f, i) => (
                      <li key={i} className="flex items-center space-x-2">
                        <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center space-x-2 pt-4 border-t border-white/5 mt-2">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all active:scale-95"
                  >
                    <Edit3 className="size-3.5 text-[#f53b70]" />
                    <span>Edit Plan</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete plan '${p.name}'?`)) {
                        onDeletePlan(p.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition-all active:scale-95"
                    title="Delete Plan"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL 1: COIN PACKAGE EDIT/CREATE ================= */}
      {isCoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-5 sm:p-6 rounded-3xl bg-[#170e20] border border-amber-500/30 shadow-2xl text-white space-y-4 max-h-[min(90dvh,720px)] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black flex items-center space-x-2">
                <Coins className="size-4 text-amber-400" />
                <span>{editingCoinPack ? "Edit Coin Package" : "Create New Coin Package"}</span>
              </h3>
              <button
                onClick={() => setIsCoinModalOpen(false)}
                className="text-[#aeaeae] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoinPack} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Package Label / Name *</label>
                  <input
                    type="text"
                    required
                    value={packLabel}
                    onChange={(e) => setPackLabel(e.target.value)}
                    placeholder="e.g. VIP Diamond, Starter Pack"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Package Unique ID</label>
                  <input
                    type="text"
                    required
                    value={packId}
                    onChange={(e) => setPackId(e.target.value)}
                    placeholder="e.g. pack_1000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Base Coins *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={packCoins}
                    onChange={(e) => setPackCoins(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-amber-400 font-mono font-bold outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Bonus Coins 🎁</label>
                  <input
                    type="number"
                    min="0"
                    value={packBonusCoins}
                    onChange={(e) => setPackBonusCoins(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-emerald-400 font-mono font-bold outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Price in PKR (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={packPricePKR}
                    onChange={(e) => setPackPricePKR(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono font-bold outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Total Coins Computed Pill */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-bold">
                <span className="text-white/70">Calculated User Credit:</span>
                <span className="text-amber-400 font-black">
                  🪙 {(Number(packCoins) + Number(packBonusCoins || 0)).toLocaleString()} Total Coins
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Promo Badge Text</label>
                  <input
                    type="text"
                    value={packBadge}
                    onChange={(e) => setPackBadge(e.target.value)}
                    placeholder="e.g. +50 BONUS 🎁, POPULAR 🔥"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Badge Color Theme</label>
                  <select
                    value={packBadgeColor}
                    onChange={(e) => setPackBadgeColor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-amber-400"
                  >
                    <option value="orange">Orange</option>
                    <option value="pink">Pink</option>
                    <option value="purple">Purple</option>
                    <option value="amber">Amber Gold</option>
                    <option value="emerald">Emerald Green</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Package Description / Perks</label>
                <textarea
                  rows={2}
                  value={packDescription}
                  onChange={(e) => setPackDescription(e.target.value)}
                  placeholder="e.g. 1,050 Coins total. Deep passionate intimate chat without limits"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <label className="flex items-center space-x-2 text-white font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={packIsPopular}
                  onChange={(e) => setPackIsPopular(e.target.checked)}
                  className="size-4 rounded accent-amber-500 cursor-pointer"
                />
                <span>Highlight as &apos;Popular Choice&apos; with Gold Halo Glow</span>
              </label>

              <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCoinModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#aeaeae] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEconomy}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {savingEconomy ? "Saving..." : editingCoinPack ? "Update Package" : "Create Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: LEGACY PLAN EDIT/CREATE ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-5 sm:p-6 rounded-3xl bg-[#170e20] border border-white/10 shadow-2xl text-white space-y-4 max-h-[min(90dvh,720px)] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black flex items-center space-x-2">
                <Tag className="size-4 text-[#f53b70]" />
                <span>{editingPlan ? "Edit Pricing Plan" : "Create New Offer / Plan"}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#aeaeae] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. VIP Plus Diamond"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Plan ID (Unique)</label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="e.g. vip_plus"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Badge Text</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. FLASH DEAL 🔥"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Badge Color</label>
                  <select
                    value={formBadgeColor}
                    onChange={(e) => setFormBadgeColor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  >
                    <option value="orange">Orange</option>
                    <option value="pink">Pink</option>
                    <option value="purple">Purple</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Price PKR (Rs.)</label>
                  <input
                    type="number"
                    required
                    value={formPricePKR}
                    onChange={(e) => setFormPricePKR(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Original PKR</label>
                  <input
                    type="number"
                    value={formOriginalPricePKR}
                    onChange={(e) => setFormOriginalPricePKR(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Price USD ($)</label>
                  <input
                    type="number"
                    value={formPriceUSD}
                    onChange={(e) => setFormPriceUSD(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Perks / Features (One per line)</label>
                <textarea
                  rows={4}
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  placeholder="Unlimited Messages / Day&#10;20 HD Photos / Day"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70] resize-none"
                />
              </div>

              <label className="flex items-center space-x-2 text-white font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsPopular}
                  onChange={(e) => setFormIsPopular(e.target.checked)}
                  className="size-4 rounded accent-[#f53b70] cursor-pointer"
                />
                <span>Highlight as &apos;Most Popular&apos;</span>
              </label>

              <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#aeaeae] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white font-black text-xs shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
