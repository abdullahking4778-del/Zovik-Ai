"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Gift,
  Flame,
  Clock,
  ExternalLink,
  Layers,
  Filter,
  CheckCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { ContentCalendarItem, CalendarConflict, CalendarItemType } from "@/types";

interface AdminCalendarTabProps {
  onNavigateToTab?: (tabId: string) => void;
}

export default function AdminCalendarTab({ onNavigateToTab }: AdminCalendarTabProps) {
  const [items, setItems] = useState<ContentCalendarItem[]>([]);
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [filterType, setFilterType] = useState<"all" | CalendarItemType>("all");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedItem, setSelectedItem] = useState<ContentCalendarItem | null>(null);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/calendar", {
        headers: { "x-zovik-admin-request": "1" },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.items || []);
          setConflicts(json.conflicts || []);
        }
      }
    } catch (e) {
      console.error("[AdminCalendarTab] Load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Month grid helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Filter items by type
  const filteredItems = items.filter((item) => {
    if (filterType === "all") return true;
    return item.type === filterType;
  });

  // Helper to get items active on a given date (year, month, day)
  const getItemsForDay = (day: number) => {
    const checkDate = new Date(year, month, day, 12, 0, 0).getTime();
    return filteredItems.filter((item) => {
      const start = new Date(item.startDate).getTime();
      const end = new Date(item.endDate).getTime();
      return checkDate >= start && checkDate <= end;
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-wider">
              Phase 4 Scheduler
            </span>
            <span className="text-xs text-[#aeaeae] font-bold">
              {items.length} Total Campaigns Scheduled
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Visual Content & Events Calendar</h2>
          <p className="text-xs text-[#aeaeae]">
            Unified calendar coordinating live events, promo offers, character drops, and conflict detection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Type Filter Pills */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                filterType === "all"
                  ? "bg-[#f53b70] text-white"
                  : "text-[#aeaeae] hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("event")}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                filterType === "event"
                  ? "bg-sky-500 text-white"
                  : "text-[#aeaeae] hover:text-white"
              }`}
            >
              Events 🎪
            </button>
            <button
              onClick={() => setFilterType("offer")}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                filterType === "offer"
                  ? "bg-amber-500 text-white"
                  : "text-[#aeaeae] hover:text-white"
              }`}
            >
              Offers 🎁
            </button>
            <button
              onClick={() => setFilterType("drop")}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                filterType === "drop"
                  ? "bg-purple-500 text-white"
                  : "text-[#aeaeae] hover:text-white"
              }`}
            >
              Drops 💎
            </button>
          </div>

          {/* Grid vs Timeline View Toggle */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === "grid" ? "bg-white/15 text-white" : "text-[#aeaeae] hover:text-white"
              }`}
            >
              Month Grid
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === "timeline" ? "bg-white/15 text-white" : "text-[#aeaeae] hover:text-white"
              }`}
            >
              Timeline List
            </button>
          </div>

          <button
            onClick={fetchCalendar}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all disabled:opacity-50"
            title="Refresh Calendar"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Conflict Detection Banner (if any conflicts) */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="size-5 text-amber-400 shrink-0" />
            <h4 className="text-sm font-black text-white">
              Scheduling Conflict Alert ({conflicts.length} Overlapping Items Detected)
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            {conflicts.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-black/40 border border-amber-500/20 text-white/90 space-y-1"
              >
                <div className="flex items-center justify-between font-bold text-amber-400">
                  <span>{c.reason}</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                    {c.severity} Severity
                  </span>
                </div>
                <p className="text-[11px] text-[#aeaeae]">
                  💡 <span className="text-white/80 font-medium">Recommendation:</span> {c.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month Navigation Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#140b1c]/80 border border-white/10">
        <div className="flex items-center space-x-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h3 className="text-lg font-black text-white">
            {monthName} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <button
          onClick={goToToday}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-colors"
        >
          Today
        </button>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="p-4 sm:p-6 rounded-3xl bg-[#140b1c]/80 border border-white/10 space-y-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-[#aeaeae] pb-2 border-b border-white/10 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Grid Cells */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank offset cells */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[90px] rounded-2xl bg-black/20 border border-white/5 p-2 opacity-30"
              />
            ))}

            {/* Days of Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayItems = getItemsForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`day-${day}`}
                  className={`min-h-[90px] rounded-2xl p-2 transition-all border flex flex-col justify-between ${
                    isToday
                      ? "bg-pink-500/10 border-pink-500/40 shadow-md shadow-pink-500/10"
                      : "bg-black/40 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-black size-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? "bg-[#f53b70] text-white"
                          : "text-white/80"
                      }`}
                    >
                      {day}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[9px] font-bold text-[#aeaeae]">
                        {dayItems.length} active
                      </span>
                    )}
                  </div>

                  {/* Badges / Chips for this day */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[75px] scrollbar-none">
                    {dayItems.map((item) => (
                      <button
                        key={`${item.id}-${day}`}
                        onClick={() => setSelectedItem(item)}
                        className="w-full text-left px-1.5 py-1 rounded-lg text-[10px] font-bold truncate transition-transform hover:scale-[1.02] active:scale-95 block"
                        style={{
                          backgroundColor: `${item.color}25`,
                          color: item.color,
                          border: `1px solid ${item.color}50`,
                        }}
                        title={item.title}
                      >
                        {item.type === "event" ? "🎪 " : item.type === "offer" ? "🎁 " : "💎 "}
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Timeline View */
        <div className="p-6 rounded-3xl bg-[#140b1c]/80 border border-white/10 space-y-4">
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-white/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-lg"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.type === "event" ? (
                      <Flame className="size-5" />
                    ) : item.type === "offer" ? (
                      <Gift className="size-5" />
                    ) : (
                      <Sparkles className="size-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white group-hover:text-pink-400 transition-colors">
                        {item.title}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                        style={{
                          backgroundColor: `${item.color}20`,
                          color: item.color,
                          border: `1px solid ${item.color}40`,
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#aeaeae] mt-0.5">{item.subtitle}</p>
                    <div className="flex items-center space-x-3 mt-1.5 text-[10px] text-[#aeaeae]">
                      <span className="flex items-center space-x-1">
                        <Clock className="size-3 text-emerald-400" />
                        <span>
                          {new Date(item.startDate).toLocaleDateString()} —{" "}
                          {new Date(item.endDate).toLocaleDateString()}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      item.status === "live"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-[#aeaeae]"
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#140b1c] border border-white/10 p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div
                className="size-11 rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundColor: selectedItem.color }}
              >
                {selectedItem.type === "event" ? (
                  <Flame className="size-6" />
                ) : selectedItem.type === "offer" ? (
                  <Gift className="size-6" />
                ) : (
                  <Sparkles className="size-6" />
                )}
              </div>
              <div>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                  style={{
                    backgroundColor: `${selectedItem.color}20`,
                    color: selectedItem.color,
                    border: `1px solid ${selectedItem.color}40`,
                  }}
                >
                  {selectedItem.badge || selectedItem.type.toUpperCase()}
                </span>
                <h3 className="text-lg font-black text-white mt-1">{selectedItem.title}</h3>
              </div>
            </div>

            {selectedItem.subtitle && (
              <p className="text-xs text-[#aeaeae] bg-black/40 p-3 rounded-xl border border-white/5">
                {selectedItem.subtitle}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-[#aeaeae] block">Start Timing</span>
                <span className="font-bold text-white">
                  {new Date(selectedItem.startDate).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-[#aeaeae] block">End Timing</span>
                <span className="font-bold text-white">
                  {new Date(selectedItem.endDate).toLocaleString()}
                </span>
              </div>
            </div>

            {selectedItem.description && (
              <div className="text-xs text-[#aeaeae]">
                <span className="font-bold text-white block mb-1">Details:</span>
                <p>{selectedItem.description}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white"
              >
                Close
              </button>

              {onNavigateToTab && (
                <button
                  onClick={() => {
                    const target =
                      selectedItem.type === "event"
                        ? "events"
                        : selectedItem.type === "offer"
                        ? "offers"
                        : "companions";
                    setSelectedItem(null);
                    onNavigateToTab(target);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#f53b70] hover:brightness-110 text-xs font-black text-white flex items-center space-x-1.5"
                >
                  <span>Edit in {selectedItem.type.toUpperCase()} Tab</span>
                  <ExternalLink className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
