"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Sparkles,
  Send,
  Trash2,
  Clock,
  Tag,
  Gift,
  AlertCircle,
  Eye,
  CheckCircle2,
  Layers,
  Flame,
  Star,
  Sliders,
  ExternalLink,
} from "lucide-react";
import {
  InAppNotification,
  SmartBannerConfig,
  PromoModalConfig,
  Character,
  NotificationType,
  NotificationTarget,
} from "@/types";

interface AdminEngagementTabProps {
  characters: Character[];
  onRefreshCharacters: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export const AdminEngagementTab: React.FC<AdminEngagementTabProps> = ({
  characters,
  onRefreshCharacters,
  getAuthHeaders,
}) => {
  // Sub-tabs inside Engagement Tab
  const [activeSubTab, setActiveSubTab] = useState<"notifs" | "banner" | "modal" | "drops">("notifs");

  // Notifications State
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifStatusMsg, setNotifStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Notification Form
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newType, setNewType] = useState<NotificationType>("promo");
  const [newAudience, setNewAudience] = useState<NotificationTarget>("all");
  const [newBadge, setNewBadge] = useState("50% OFF");
  const [newLinkUrl, setNewLinkUrl] = useState("/?modal=store");
  const [newActionText, setNewActionText] = useState("Claim Deal");
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Smart Banner State
  const [bannerConfig, setBannerConfig] = useState<SmartBannerConfig>({
    id: "banner_default",
    title: "Weekend Flash Sale: Get 50% Extra Coins with code WELCOME50!",
    subtitle: "1 PKR = 1 Coin. Zero fees via EasyPaisa, JazzCash & Binance Pay.",
    style: "ticker",
    highlightText: "LIMITED TIME",
    badge: "FLASH DEAL",
    ctaText: "Claim 50% Off",
    ctaLink: "/?modal=store",
    targetAudience: "all",
    countdownTarget: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isActive: true,
    isDismissible: true,
    updatedAt: new Date().toISOString(),
  });
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [bannerStatusMsg, setBannerStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Promo Modal State
  const [promoModalConfig, setPromoModalConfig] = useState<PromoModalConfig>({
    id: "modal_default",
    title: "🎉 Exclusive VIP Companion Drop!",
    body: "Experience ultra-realistic voice chats and uncensored photo sessions with our newly dropped VIP companions. Grab the Starter or Whale pack today to unlock all galleries.",
    badge: "VIP SPECIAL",
    ctaText: "Get Extra Coins Now",
    ctaLink: "/?modal=store",
    isActive: false,
    showOncePerSession: true,
    updatedAt: new Date().toISOString(),
  });
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [modalStatusMsg, setModalStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Selected Character for Drop Badge Management
  const [selectedCharId, setSelectedCharId] = useState<string>("");
  const [selectedDropBadge, setSelectedDropBadge] = useState<"NEW" | "HOT" | "VIP" | "LIMITED" | "TRENDING">("HOT");
  const [isSavingDrop, setIsSavingDrop] = useState(false);

  // Load initial data
  const fetchEngagementData = async () => {
    setNotifLoading(true);
    const headers = getAuthHeaders();
    try {
      // 1. Fetch Notifications
      const nRes = await fetch("/api/admin/notifications", { headers, cache: "no-store" });
      if (nRes.ok) {
        const nData = await nRes.json();
        if (Array.isArray(nData.notifications)) {
          setNotifications(nData.notifications);
        }
      }

      // 2. Fetch Banner & Modal Settings
      const bRes = await fetch("/api/admin/engagement/banner", { headers, cache: "no-store" });
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.banner) {
          setBannerConfig({
            ...bData.banner,
            countdownTarget: bData.banner.countdownTarget
              ? bData.banner.countdownTarget.slice(0, 16)
              : "",
          });
        }
        if (bData.promoModal) {
          setPromoModalConfig(bData.promoModal);
        }
      }
    } catch (err) {
      console.error("Failed loading engagement settings:", err);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchEngagementData();
    if (characters.length > 0 && !selectedCharId) {
      setSelectedCharId(characters[0].id);
    }
  }, [characters]);

  // Send New Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      alert("Please provide title and message!");
      return;
    }

    setIsSendingNotif(true);
    setNotifStatusMsg(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: newTitle.trim(),
          message: newMessage.trim(),
          type: newType,
          targetAudience: newAudience,
          badge: newBadge.trim() || undefined,
          linkUrl: newLinkUrl.trim() || undefined,
          actionText: newActionText.trim() || undefined,
          priority: "high",
          isActive: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotifStatusMsg({ type: "success", text: "Broadcast notification sent to all user inboxes! 🚀" });
        setNewTitle("");
        setNewMessage("");
        fetchEngagementData();
      } else {
        setNotifStatusMsg({ type: "error", text: data.error || "Failed to send notification" });
      }
    } catch {
      setNotifStatusMsg({ type: "error", text: "Network error sending notification" });
    } finally {
      setIsSendingNotif(false);
    }
  };

  // Delete Notification
  const handleDeleteNotification = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        alert("Failed to delete notification");
      }
    } catch {
      alert("Error deleting notification");
    }
  };

  // Save Banner Config
  const handleSaveBanner = async () => {
    setIsSavingBanner(true);
    setBannerStatusMsg(null);
    try {
      const res = await fetch("/api/admin/engagement/banner", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          banner: {
            ...bannerConfig,
            countdownTarget: bannerConfig.countdownTarget
              ? new Date(bannerConfig.countdownTarget).toISOString()
              : undefined,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBannerStatusMsg({ type: "success", text: "Smart banner settings saved & live! 📢" });
      } else {
        setBannerStatusMsg({ type: "error", text: data.error || "Failed to save banner" });
      }
    } catch {
      setBannerStatusMsg({ type: "error", text: "Network error saving banner" });
    } finally {
      setIsSavingBanner(false);
    }
  };

  // Save Promo Modal Config
  const handleSaveModal = async () => {
    setIsSavingModal(true);
    setModalStatusMsg(null);
    try {
      const res = await fetch("/api/admin/engagement/banner", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ promoModal: promoModalConfig }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModalStatusMsg({ type: "success", text: "Promo modal popup settings saved! 🎁" });
      } else {
        setModalStatusMsg({ type: "error", text: data.error || "Failed to save modal" });
      }
    } catch {
      setModalStatusMsg({ type: "error", text: "Network error saving modal" });
    } finally {
      setIsSavingModal(false);
    }
  };

  // Assign Drop Badge to Character
  const handleAssignDropBadge = async () => {
    if (!selectedCharId) return;
    const targetChar = characters.find((c) => c.id === selectedCharId);
    if (!targetChar) return;

    setIsSavingDrop(true);
    try {
      const updatedChar: Character = {
        ...targetChar,
        dropBadge: selectedDropBadge,
        badge: selectedDropBadge, // Also sync display badge
      };

      const res = await fetch("/api/admin/characters", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedChar),
      });

      if (res.ok) {
        alert(`Drop badge "${selectedDropBadge}" assigned to ${targetChar.name} successfully! ✨`);
        onRefreshCharacters();
      } else {
        alert("Failed to update character drop badge");
      }
    } catch {
      alert("Error saving character drop badge");
    } finally {
      setIsSavingDrop(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: "notifs", label: `🔔 Push In-App Notifications (${notifications.length})`, count: notifications.length },
          { id: "banner", label: "📢 Smart Top Banner & Ticker" },
          { id: "modal", label: "🎁 Promo Modal Popup" },
          { id: "drops", label: "🤖 Character Drops & Badges" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === tab.id
                ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white shadow-md shadow-pink-600/20"
                : "bg-white/5 hover:bg-white/10 text-[#aeaeae] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= SUB-TAB 1: NOTIFICATIONS ================= */}
      {activeSubTab === "notifs" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Notification Form */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-[#140b1a] border border-white/10 shadow-lg space-y-4">
            <div className="flex items-center space-x-2">
              <div className="size-8 rounded-xl bg-pink-500/20 flex items-center justify-center text-[#f53b70]">
                <Send className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Broadcast New Notification</h3>
                <p className="text-[11px] text-[#aeaeae]">Send instant alerts to user bell inboxes</p>
              </div>
            </div>

            {notifStatusMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                  notifStatusMsg.type === "success"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{notifStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-white mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 🔥 Weekend 50% Bonus Coins!"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="e.g. Use code WELCOME50 at checkout to claim your 50% discount on any coin pack."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-white mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-pink-500"
                  >
                    <option value="promo">🎁 Promo Deal</option>
                    <option value="event">🎉 Special Event</option>
                    <option value="reward">🪙 Free Reward</option>
                    <option value="alert">⚡ System Alert</option>
                    <option value="info">ℹ️ General Info</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-white mb-1">Audience</label>
                  <select
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-pink-500"
                  >
                    <option value="all">🌍 All Users</option>
                    <option value="free">🆓 Free Users</option>
                    <option value="vip">👑 VIP Users Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-white mb-1">Badge Pill (Optional)</label>
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="e.g. 50% OFF"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-white mb-1">Action Button Text</label>
                  <input
                    type="text"
                    value={newActionText}
                    onChange={(e) => setNewActionText(e.target.value)}
                    placeholder="e.g. Claim Deal"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">Action Link (Optional)</label>
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="e.g. /?modal=store or /app"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingNotif}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f53b70] via-pink-600 to-[#8b5cf6] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Send className="size-3.5" />
                <span>{isSendingNotif ? "Broadcasting..." : "Broadcast Notification 🚀"}</span>
              </button>
            </form>
          </div>

          {/* Existing Notifications Table */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-[#140b1a] border border-white/10 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Active Notifications ({notifications.length})</h3>
                <p className="text-[11px] text-[#aeaeae]">Messages currently appearing in user notification bells</p>
              </div>
            </div>

            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#888]">No active notifications</div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="py-3 flex items-start justify-between gap-3 group">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono uppercase font-bold text-pink-300">
                          {notif.type}
                        </span>
                        {notif.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-[#f53b70] text-[9px] font-black border border-pink-500/30">
                            {notif.badge}
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-white">{notif.title}</h4>
                      </div>
                      <p className="text-[11px] text-[#aeaeae] line-clamp-2">{notif.message}</p>
                      <div className="flex items-center space-x-3 text-[10px] text-[#666]">
                        <span>Audience: <strong className="text-white/60">{notif.targetAudience}</strong></span>
                        {notif.linkUrl && (
                          <span className="flex items-center space-x-1 text-pink-400">
                            <span>Link: {notif.linkUrl}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteNotification(notif.id)}
                      className="size-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors shrink-0"
                      title="Delete notification"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 2: SMART TOP BANNER ================= */}
      {activeSubTab === "banner" && (
        <div className="p-6 rounded-2xl bg-[#140b1a] border border-white/10 shadow-lg space-y-6 max-w-4xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center space-x-2">
              <div className="size-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Sliders className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Smart Top Banner & Countdown Ticker</h3>
                <p className="text-[11px] text-[#aeaeae]">Controls the sticky announcement bar displayed at the top of the site</p>
              </div>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bannerConfig.isActive}
                onChange={(e) => setBannerConfig({ ...bannerConfig, isActive: e.target.checked })}
                className="size-4 rounded accent-pink-500"
              />
              <span className={`text-xs font-black ${bannerConfig.isActive ? "text-emerald-400" : "text-white/40"}`}>
                {bannerConfig.isActive ? "BANNER LIVE 🟢" : "DISABLED ⚪"}
              </span>
            </label>
          </div>

          {bannerStatusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                bannerStatusMsg.type === "success"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}
            >
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{bannerStatusMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-white mb-1">Banner Title / Announcement Text</label>
              <input
                type="text"
                value={bannerConfig.title}
                onChange={(e) => setBannerConfig({ ...bannerConfig, title: e.target.value })}
                placeholder="e.g. Weekend Flash Sale: Get 50% Extra Coins with code WELCOME50!"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1">Highlight Prefix</label>
              <input
                type="text"
                value={bannerConfig.highlightText || ""}
                onChange={(e) => setBannerConfig({ ...bannerConfig, highlightText: e.target.value })}
                placeholder="e.g. LIMITED TIME"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1">Badge Pill</label>
              <input
                type="text"
                value={bannerConfig.badge || ""}
                onChange={(e) => setBannerConfig({ ...bannerConfig, badge: e.target.value })}
                placeholder="e.g. FLASH DEAL"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1">Countdown Target Date & Time</label>
              <input
                type="datetime-local"
                value={bannerConfig.countdownTarget || ""}
                onChange={(e) => setBannerConfig({ ...bannerConfig, countdownTarget: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1">CTA Button Text & Link</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={bannerConfig.ctaText || ""}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, ctaText: e.target.value })}
                  placeholder="e.g. Claim 50% Off"
                  className="w-1/2 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={bannerConfig.ctaLink || ""}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, ctaLink: e.target.value })}
                  placeholder="/?modal=store"
                  className="w-1/2 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveBanner}
            disabled={isSavingBanner}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {isSavingBanner ? "Saving Banner..." : "Save & Publish Smart Banner 📢"}
          </button>
        </div>
      )}

      {/* ================= SUB-TAB 3: PROMO MODAL POPUP ================= */}
      {activeSubTab === "modal" && (
        <div className="p-6 rounded-2xl bg-[#140b1a] border border-white/10 shadow-lg space-y-6 max-w-4xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center space-x-2">
              <div className="size-9 rounded-xl bg-pink-500/20 flex items-center justify-center text-[#f53b70]">
                <Gift className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Promotional Entrance Popup Modal</h3>
                <p className="text-[11px] text-[#aeaeae]">Displays an attention-grabbing offer popup when users visit the web app</p>
              </div>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={promoModalConfig.isActive}
                onChange={(e) => setPromoModalConfig({ ...promoModalConfig, isActive: e.target.checked })}
                className="size-4 rounded accent-pink-500"
              />
              <span className={`text-xs font-black ${promoModalConfig.isActive ? "text-emerald-400" : "text-white/40"}`}>
                {promoModalConfig.isActive ? "POPUP ACTIVE 🟢" : "DISABLED ⚪"}
              </span>
            </label>
          </div>

          {modalStatusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                modalStatusMsg.type === "success"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}
            >
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{modalStatusMsg.text}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Modal Title</label>
              <input
                type="text"
                value={promoModalConfig.title}
                onChange={(e) => setPromoModalConfig({ ...promoModalConfig, title: e.target.value })}
                placeholder="e.g. 🎉 Exclusive VIP Companion Drop!"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1">Modal Body Text</label>
              <textarea
                value={promoModalConfig.body}
                onChange={(e) => setPromoModalConfig({ ...promoModalConfig, body: e.target.value })}
                rows={3}
                placeholder="Description of the offer or newly dropped character..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1">Badge Text</label>
                <input
                  type="text"
                  value={promoModalConfig.badge || ""}
                  onChange={(e) => setPromoModalConfig({ ...promoModalConfig, badge: e.target.value })}
                  placeholder="e.g. VIP SPECIAL"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">Image URL (Optional)</label>
                <input
                  type="text"
                  value={promoModalConfig.imageUrl || ""}
                  onChange={(e) => setPromoModalConfig({ ...promoModalConfig, imageUrl: e.target.value })}
                  placeholder="e.g. /characters/sakura.png"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">CTA Button Text</label>
                <input
                  type="text"
                  value={promoModalConfig.ctaText || ""}
                  onChange={(e) => setPromoModalConfig({ ...promoModalConfig, ctaText: e.target.value })}
                  placeholder="e.g. Get Extra Coins Now"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">CTA Link</label>
                <input
                  type="text"
                  value={promoModalConfig.ctaLink || ""}
                  onChange={(e) => setPromoModalConfig({ ...promoModalConfig, ctaLink: e.target.value })}
                  placeholder="e.g. /?modal=store"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveModal}
            disabled={isSavingModal}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-600/30 transition-all disabled:opacity-50"
          >
            {isSavingModal ? "Saving Modal..." : "Save Promo Modal Popup 🎁"}
          </button>
        </div>
      )}

      {/* ================= SUB-TAB 4: CHARACTER DROPS & BADGES ================= */}
      {activeSubTab === "drops" && (
        <div className="p-6 rounded-2xl bg-[#140b1a] border border-white/10 shadow-lg space-y-6 max-w-4xl">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-4">
            <div className="size-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Character Drops & Exclusivity Badges</h3>
              <p className="text-[11px] text-[#aeaeae]">Highlight top companions with glowing badges (HOT, NEW, VIP, LIMITED, TRENDING)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Select Companion</label>
              <select
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-400"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.dropBadge || c.badge || "Standard"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1">Drop / Highlight Badge</label>
              <select
                value={selectedDropBadge}
                onChange={(e) => setSelectedDropBadge(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-400"
              >
                <option value="HOT">🔥 HOT (Trending High)</option>
                <option value="NEW">✨ NEW (Recently Dropped)</option>
                <option value="VIP">👑 VIP ONLY (Exclusive Tier)</option>
                <option value="LIMITED">💎 LIMITED (Scarcity Drop)</option>
                <option value="TRENDING">📈 TRENDING (Popular This Week)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleAssignDropBadge}
            disabled={isSavingDrop}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
          >
            {isSavingDrop ? "Assigning..." : "Assign Badge to Companion ✨"}
          </button>
        </div>
      )}
    </div>
  );
};
