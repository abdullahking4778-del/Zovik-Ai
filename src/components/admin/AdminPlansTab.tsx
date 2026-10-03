"use client";

import React, { useState } from "react";
import { PricingPlan } from "@/types";
import { Plus, Edit3, Trash2, CheckCircle2, AlertCircle, Sparkles, Tag, DollarSign, Calendar } from "lucide-react";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);

  // Form fields
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formBadgeColor, setFormBadgeColor] = useState("orange");
  const [formPricePKR, setFormPricePKR] = useState(1500);
  const [formOriginalPricePKR, setFormOriginalPricePKR] = useState(3000);
  const [formPriceUSD, setFormPriceUSD] = useState(5);
  const [formDurationDays, setFormDurationDays] = useState(30);
  const [formFeatures, setFormFeatures] = useState("");
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Tag className="size-5 text-[#f53b70]" />
            <span>Pricing Plans & Special Offers CMS</span>
          </h2>
          <p className="text-xs text-[#aeaeae] mt-0.5">
            Modify plan prices (e.g. Rs 3,000 to Rs 1,500), create new offers (VIP Plus, Flash Deals), and edit perks live on your platform.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white text-xs font-black shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus className="size-4" />
          <span>Add New Plan / Offer</span>
        </button>
      </div>

      {/* Plans Cards Grid */}
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
              {/* Badge & ID */}
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

              {/* Title & Price */}
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

              {/* Features List */}
              <ul className="space-y-2 text-xs text-[#d5c7d0] my-4 border-t border-white/5 pt-4">
                {p.features?.map((f, i) => (
                  <li key={i} className="flex items-center space-x-2">
                    <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-4 border-t border-white/5 mt-2">
              <button
                onClick={() => handleOpenEdit(p)}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
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
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition-all active:scale-95 cursor-pointer"
                title="Delete Plan"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Plan Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#170e20] border border-white/10 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
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
                  <label className="text-[#aeaeae] block mb-1 font-bold">Plan ID (Slug)</label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="e.g. vip_plus"
                    disabled={!!editingPlan}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-[#f53b70] disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Offer Badge Text</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. 70% OFF or BEST VALUE 🔥"
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
                    <option value="pink">Pink / Hot Deal</option>
                    <option value="purple">Purple / Exclusive</option>
                    <option value="orange">Orange / Discount</option>
                    <option value="emerald">Green / Best Deal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Discounted Price (PKR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formPricePKR}
                    onChange={(e) => setFormPricePKR(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-bold outline-none focus:border-[#f53b70]"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Original Price (PKR)</label>
                  <input
                    type="number"
                    min={1}
                    value={formOriginalPricePKR}
                    onChange={(e) => setFormOriginalPricePKR(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Price (USD $)</label>
                  <input
                    type="number"
                    min={1}
                    value={formPriceUSD}
                    onChange={(e) => setFormPriceUSD(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Validity (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={formDurationDays}
                  onChange={(e) => setFormDurationDays(Number(e.target.value))}
                  placeholder="30"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                />
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">
                  Perks & Features (One per line)
                </label>
                <textarea
                  rows={4}
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  placeholder="Unlimited Messages / Day&#10;30 HD Photos / Day&#10;18+ Uncensored Chat&#10;Voice Calls Unlocked"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-[#f53b70] leading-relaxed"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="popularCheck"
                  checked={formIsPopular}
                  onChange={(e) => setFormIsPopular(e.target.checked)}
                  className="size-4 accent-[#f53b70] cursor-pointer"
                />
                <label htmlFor="popularCheck" className="text-white cursor-pointer select-none">
                  Highlight as &quot;Popular / Best Value&quot; card
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white font-black shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Save Plan 💾"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
