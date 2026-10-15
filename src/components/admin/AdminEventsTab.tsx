"use client";

import React, { useState } from "react";
import {
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Percent,
  Tag,
  Zap,
  Flame,
} from "lucide-react";
import { AppEvent, EventType, EventStatus, EventVisibility } from "@/types";

interface AdminEventsTabProps {
  events: AppEvent[];
  onRefresh: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export const AdminEventsTab: React.FC<AdminEventsTabProps> = ({
  events,
  onRefresh,
  getAuthHeaders,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<AppEvent>>({
    title: "",
    subtitle: "",
    description: "",
    type: "weekly",
    badge: "FLASH DEAL 🔥",
    themeColor: "#f53b70",
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    actionType: "open_premium",
    actionTarget: "vip",
    actionText: "Claim Deal",
    visibility: "all",
    priority: 5,
    isActive: true,
    discountPercent: 50,
  });

  const liveEvents = events.filter((e) => e.status === "live");
  const scheduledEvents = events.filter((e) => e.status === "scheduled");
  const endedEvents = events.filter((e) => e.status === "ended" || e.status === "draft");

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      subtitle: "",
      description: "",
      type: "weekly",
      badge: "FLASH DEAL 🔥",
      themeColor: "#f53b70",
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      actionType: "open_premium",
      actionTarget: "vip",
      actionText: "Claim Deal",
      visibility: "all",
      priority: 5,
      isActive: true,
      discountPercent: 50,
    });
    setIsModalOpen(true);
    setStatusMsg(null);
  };

  const openEditModal = (event: AppEvent) => {
    setEditingEvent(event);
    setFormData({
      ...event,
      startDate: new Date(event.startDate).toISOString().slice(0, 16),
      endDate: new Date(event.endDate).toISOString().slice(0, 16),
    });
    setIsModalOpen(true);
    setStatusMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      setStatusMsg({ type: "error", text: "Event title is required." });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    try {
      const payload: Partial<AppEvent> = {
        ...formData,
        id: editingEvent?.id,
        startDate: new Date(formData.startDate || "").toISOString(),
        endDate: new Date(formData.endDate || "").toISOString(),
      };

      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: "success", text: "Event saved and published successfully! 🚀" });
        setIsModalOpen(false);
        onRefresh();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to save event." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error while saving event." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (event: AppEvent) => {
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...event,
          isActive: !event.isActive,
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch {
      alert("Failed to toggle event status.");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete event: "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/events?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert("Failed to delete event.");
      }
    } catch {
      alert("Error deleting event.");
    }
  };

  // Helper date preset buttons
  const setPresetDates = (days: number) => {
    const start = new Date();
    const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setFormData((prev) => ({
      ...prev,
      startDate: start.toISOString().slice(0, 16),
      endDate: end.toISOString().slice(0, 16),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center space-x-3">
          <div className="size-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
            <Flame className="size-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{liveEvents.length}</div>
            <div className="text-[11px] text-[#aeaeae]">Currently Live Events</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center space-x-3">
          <div className="size-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Clock className="size-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{scheduledEvents.length}</div>
            <div className="text-[11px] text-[#aeaeae]">Scheduled Upcoming</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center space-x-3">
          <div className="size-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Percent className="size-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">
              {liveEvents.find((e) => e.discountPercent)?.discountPercent || 0}%
            </div>
            <div className="text-[11px] text-[#aeaeae]">Active Peak Discount</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-white">{events.length}</div>
            <div className="text-[11px] text-[#aeaeae]">Total Configured</div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white text-xs font-black shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            <span>New Event</span>
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

      {/* Events Table / Card List */}
      <div className="rounded-2xl bg-[#140b1a] border border-white/5 p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-2">
              <Calendar className="size-4 text-[#f53b70]" />
              <span>Events & Seasonal Drops Manager</span>
            </h3>
            <p className="text-xs text-[#aeaeae]">
              Manage weekly specials, holiday drops, limited-edition characters and promotional campaigns.
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12 text-[#aeaeae] text-xs">
            No events found. Click &quot;New Event&quot; to create your first seasonal campaign.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((evt) => {
              const isLive = evt.status === "live";
              const isScheduled = evt.status === "scheduled";

              return (
                <div
                  key={evt.id}
                  className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5">
                    <div
                      className="size-11 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm shadow-md"
                      style={{ backgroundColor: evt.themeColor || "#f53b70" }}
                    >
                      {evt.type === "weekly" ? "7D" : evt.type === "seasonal" ? "🌸" : "⚡"}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-sm text-white">{evt.title}</span>

                        {evt.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-black text-pink-300 uppercase tracking-wide">
                            {evt.badge}
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center space-x-1 ${
                            isLive
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : isScheduled
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isLive ? "bg-emerald-400 animate-ping" : isScheduled ? "bg-purple-400" : "bg-gray-400"
                            }`}
                          />
                          <span>{evt.status}</span>
                        </span>

                        <span className="text-[10px] text-[#aeaeae] bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
                          Type: {evt.type}
                        </span>

                        {evt.discountPercent && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            {evt.discountPercent}% Off
                          </span>
                        )}
                      </div>

                      {evt.subtitle && <p className="text-xs text-[#cbb6bf]">{evt.subtitle}</p>}

                      <div className="flex items-center space-x-3 text-[11px] text-[#888] pt-1">
                        <span className="flex items-center space-x-1">
                          <Clock className="size-3" />
                          <span>
                            {new Date(evt.startDate).toLocaleDateString()} - {new Date(evt.endDate).toLocaleDateString()}
                          </span>
                        </span>
                        <span>•</span>
                        <span>Target: {evt.visibility}</span>
                        <span>•</span>
                        <span>Action: {evt.actionType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleToggleActive(evt)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        evt.isActive
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          : "bg-white/10 text-white/50 hover:bg-white/20"
                      }`}
                      title={evt.isActive ? "Deactivate Event" : "Activate Event"}
                    >
                      {evt.isActive ? "Active" : "Disabled"}
                    </button>

                    <button
                      onClick={() => openEditModal(evt)}
                      className="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors"
                      title="Edit Event"
                    >
                      <Edit3 className="size-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(evt.id, evt.title)}
                      className="size-8 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors"
                      title="Delete Event"
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

      {/* Create / Edit Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#140b1a] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="size-9 rounded-xl bg-[#f53b70]/20 flex items-center justify-center text-[#f53b70]">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    {editingEvent ? "Edit Event" : "Create New Event & Drop"}
                  </h2>
                  <p className="text-xs text-[#aeaeae]">Configure live promotion, dates, discounts and badges</p>
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
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Weekend Flash Festival"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g. 50% OFF ⚡"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Subtitle / Punchline</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Double Coins + 50% Off VIP Subscriptions"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Event Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Full promotional context displayed to users..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Event Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                  >
                    <option value="weekly">Weekly Special</option>
                    <option value="monthly">Monthly Event</option>
                    <option value="seasonal">Seasonal Drop</option>
                    <option value="flash">Flash Sale (24-48h)</option>
                    <option value="special">Special Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Theme Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.themeColor || "#f53b70"}
                      onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                      className="size-9 rounded-xl bg-transparent border-none cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.themeColor}
                      onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discountPercent ?? ""}
                    onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) || 0 })}
                    placeholder="e.g. 50"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                  />
                </div>
              </div>

              {/* Timing Presets */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#cbb6bf]">Schedule Dates</label>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setPresetDates(2)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-pink-300 font-bold"
                    >
                      Weekend (48h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetDates(7)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-pink-300 font-bold"
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetDates(30)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-pink-300 font-bold"
                    >
                      30 Days
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-[#aeaeae] mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#aeaeae] mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                    />
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Action Type</label>
                  <select
                    value={formData.actionType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actionType: e.target.value as AppEvent["actionType"],
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                  >
                    <option value="open_premium">Open Premium Modal</option>
                    <option value="open_character">Open Companion</option>
                    <option value="open_link">Custom Link</option>
                    <option value="none">No Action</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Target / Link</label>
                  <input
                    type="text"
                    value={formData.actionTarget}
                    onChange={(e) => setFormData({ ...formData, actionTarget: e.target.value })}
                    placeholder="vip, character_id, or /route"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Button Text</label>
                  <input
                    type="text"
                    value={formData.actionText}
                    onChange={(e) => setFormData({ ...formData, actionText: e.target.value })}
                    placeholder="Claim Deal"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                  />
                </div>
              </div>

              {/* Visibility and Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Audience</label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as EventVisibility })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                  >
                    <option value="all">All Visitors</option>
                    <option value="premium">Premium/VIP Only</option>
                    <option value="free">Free Users Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbb6bf] mb-1">Priority Order</label>
                  <input
                    type="number"
                    value={formData.priority ?? 5}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-6">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="size-4 accent-[#f53b70] cursor-pointer"
                  />
                  <label htmlFor="isActiveToggle" className="text-xs font-bold text-white cursor-pointer">
                    Enable Event (Live)
                  </label>
                </div>
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
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white text-xs font-black shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingEvent ? "Update Event" : "Publish Event 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
