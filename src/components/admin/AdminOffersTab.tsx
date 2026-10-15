"use client";

import React, { useState } from "react";
import {
  Tag,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Percent,
  Coins,
  DollarSign,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Offer, DiscountType, AudienceType } from "@/types";

interface AdminOffersTabProps {
  offers: Offer[];
  onRefresh: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export const AdminOffersTab: React.FC<AdminOffersTabProps> = ({
  offers,
  onRefresh,
  getAuthHeaders,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Offer>>({
    code: "",
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: 50,
    minPurchasePKR: 100,
    maxRedemptions: 500,
    currentRedemptions: 0,
    perUserLimit: 1,
    validFrom: new Date().toISOString().slice(0, 16),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    targetAudience: "all",
    isActive: true,
  });

  const totalRedemptions = offers.reduce((acc, o) => acc + (o.currentRedemptions || 0), 0);
  const activeOffers = offers.filter((o) => o.isActive);

  const openCreateModal = () => {
    setEditingOffer(null);
    setFormData({
      code: "",
      title: "",
      description: "",
      discountType: "percentage",
      discountValue: 50,
      minPurchasePKR: 100,
      maxRedemptions: 500,
      currentRedemptions: 0,
      perUserLimit: 1,
      validFrom: new Date().toISOString().slice(0, 16),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      targetAudience: "all",
      isActive: true,
    });
    setIsModalOpen(true);
    setStatusMsg(null);
  };

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      ...offer,
      validFrom: new Date(offer.validFrom).toISOString().slice(0, 16),
      validTo: new Date(offer.validTo).toISOString().slice(0, 16),
    });
    setIsModalOpen(true);
    setStatusMsg(null);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code?.trim()) {
      setStatusMsg({ type: "error", text: "Promo code is strictly required." });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    try {
      const payload: Partial<Offer> = {
        ...formData,
        id: editingOffer?.id,
        code: formData.code.trim().toUpperCase(),
        validFrom: new Date(formData.validFrom || "").toISOString(),
        validTo: new Date(formData.validTo || "").toISOString(),
      };

      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: "success", text: `Promo code '${payload.code}' saved successfully! 🚀` });
        setIsModalOpen(false);
        onRefresh();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to save promo code." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error while saving promo code." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...offer,
          isActive: !offer.isActive,
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch {
      alert("Failed to toggle promo code state.");
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete promo code: "${code}"?`)) return;

    try {
      const res = await fetch(`/api/admin/offers?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert("Failed to delete promo code.");
      }
    } catch {
      alert("Error deleting promo code.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center space-x-3">
          <div className="size-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
            <Tag className="size-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{offers.length}</div>
            <div className="text-[11px] text-[#aeaeae]">Total Promo Codes</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center space-x-3">
          <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{activeOffers.length}</div>
            <div className="text-[11px] text-[#aeaeae]">Active Codes Live</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center space-x-3">
          <div className="size-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <div className="text-xl font-black text-amber-300">
              {totalRedemptions.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#aeaeae]">Times Redeemed</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-white">Live Pricing</div>
            <div className="text-[11px] text-[#aeaeae]">Real-Time Discounts</div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-black shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            <span>New Code</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-bold ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Offers Cards / Table */}
      <div className="rounded-2xl bg-[#140b1a] border border-white/5 p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2">
              <Tag className="size-4 text-amber-400" />
              <span>Promo Codes & Live Offers Engine</span>
            </h3>
            <p className="text-xs text-[#aeaeae]">
              Create coupon codes, percentage discounts, flat cash off, and bonus coin promotions for users.
            </p>
          </div>
        </div>

        {offers.length === 0 ? (
          <div className="text-center py-12 text-[#aeaeae] text-xs">
            No promo codes configured yet. Click &quot;New Code&quot; to launch your first promotional offer.
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => {
              const now = Date.now();
              const isExpired = now > new Date(offer.validTo).getTime();
              const isLive = offer.isActive && !isExpired;

              return (
                <div
                  key={offer.id}
                  className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5">
                    {/* Discount Icon / Visual */}
                    <div className="size-11 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 font-black text-xs shadow-md">
                      {offer.discountType === "percentage" && <Percent className="size-5" />}
                      {offer.discountType === "flat_pkr" && "Rs"}
                      {offer.discountType === "flat_usd" && <DollarSign className="size-5" />}
                      {offer.discountType === "bonus_coins" && <Coins className="size-5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        {/* Coupon Pill with copy */}
                        <button
                          onClick={() => handleCopyCode(offer.code)}
                          className="px-2.5 py-0.5 rounded-lg bg-black/60 hover:bg-black/80 border border-amber-500/30 text-amber-300 text-xs font-mono font-black flex items-center space-x-1.5 transition-colors group shadow-sm"
                          title="Click to copy promo code"
                        >
                          <span>{offer.code}</span>
                          {copiedCode === offer.code ? (
                            <Check className="size-3 text-emerald-400" />
                          ) : (
                            <Copy className="size-3 text-white/40 group-hover:text-white" />
                          )}
                        </button>

                        <span className="font-bold text-sm text-white">{offer.title}</span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center space-x-1 ${
                            isLive
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isLive ? "bg-emerald-400 animate-ping" : "bg-red-400"
                            }`}
                          />
                          <span>{isLive ? "ACTIVE" : isExpired ? "EXPIRED" : "DISABLED"}</span>
                        </span>

                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          {offer.discountType === "percentage" && `${offer.discountValue}% Off`}
                          {offer.discountType === "flat_pkr" && `Rs. ${offer.discountValue} Off`}
                          {offer.discountType === "flat_usd" && `$${offer.discountValue} USD Off`}
                          {offer.discountType === "bonus_coins" && `+${offer.discountValue} Bonus Coins`}
                        </span>
                      </div>

                      {offer.description && (
                        <p className="text-xs text-[#cbb6bf]">{offer.description}</p>
                      )}

                      <div className="flex items-center space-x-3 text-[11px] text-[#888] pt-1 flex-wrap gap-y-1">
                        <span>
                          Redeemed: <strong className="text-white font-mono">{offer.currentRedemptions}</strong>
                          {offer.maxRedemptions ? ` / ${offer.maxRedemptions}` : " (Unlimited)"}
                        </span>
                        <span>•</span>
                        <span>Min Order: Rs. {offer.minPurchasePKR || 0}</span>
                        <span>•</span>
                        <span>Audience: {offer.targetAudience}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="size-3" />
                          <span>Expires: {new Date(offer.validTo).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleToggleActive(offer)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        offer.isActive
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          : "bg-white/10 text-white/50 hover:bg-white/20"
                      }`}
                      title={offer.isActive ? "Disable Offer" : "Activate Offer"}
                    >
                      {offer.isActive ? "Active" : "Disabled"}
                    </button>

                    <button
                      onClick={() => openEditModal(offer)}
                      className="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors"
                      title="Edit Offer"
                    >
                      <Edit3 className="size-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(offer.id, offer.code)}
                      className="size-8 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors"
                      title="Delete Promo Code"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Promo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#140b1a] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="size-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300">
                  <Tag className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    {editingOffer ? "Edit Promo Code" : "Create New Promo Code"}
                  </h2>
                  <p className="text-xs text-[#aeaeae]">Configure discounts, redemption limits and validity</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Promo Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. EID50, ZOVIK100"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold text-xs outline-none focus:border-amber-400 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Offer Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. 50% Off First Package"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Offer Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Apply at checkout to receive 50% instant discount"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({ ...formData, discountType: e.target.value as DiscountType })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat_pkr">Flat Cash (PKR Rs)</option>
                    <option value="flat_usd">Flat Cash (USDT $)</option>
                    <option value="bonus_coins">Bonus Coins (🪙)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">
                    Discount Value {formData.discountType === "percentage" ? "(%)" : "(Amount/Coins)"} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.discountValue ?? 50}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Min Order (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minPurchasePKR ?? 0}
                    onChange={(e) => setFormData({ ...formData, minPurchasePKR: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Max Total Uses</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxRedemptions ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxRedemptions: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="Unlimited"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Uses Per User</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.perUserLimit ?? 1}
                    onChange={(e) => setFormData({ ...formData, perUserLimit: Number(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) =>
                      setFormData({ ...formData, targetAudience: e.target.value as AudienceType })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                  >
                    <option value="all">All Visitors</option>
                    <option value="free">Free / New Users Only</option>
                    <option value="vip">VIP Members Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-[11px] text-[#aeaeae] mb-1">Valid From</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#aeaeae] mb-1">Valid To (Expiry)</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-4 border-t border-white/5">
                <input
                  type="checkbox"
                  id="offerActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="size-4 accent-amber-400 cursor-pointer"
                />
                <label htmlFor="offerActiveToggle" className="text-xs font-bold text-white cursor-pointer">
                  Activate Promo Code Immediately
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-black shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingOffer ? "Update Code" : "Create Code 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
