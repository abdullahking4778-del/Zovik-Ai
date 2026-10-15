"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  MessageSquare,
  Sparkles,
  Flame,
  Award,
  RefreshCw,
  Gift,
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  Split,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { AnalyticsOverview, ABExperimentConfig } from "@/types";

interface AdminAnalyticsTabProps {
  onNavigateToTab?: (tabId: string) => void;
}

export default function AdminAnalyticsTab({ onNavigateToTab }: AdminAnalyticsTabProps) {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [experiments, setExperiments] = useState<ABExperimentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingExpId, setUpdatingExpId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsRes, expRes] = await Promise.all([
        fetch("/api/admin/analytics", {
          headers: { "x-zovik-admin-request": "1" },
          cache: "no-store",
        }),
        fetch("/api/admin/experiments", {
          headers: { "x-zovik-admin-request": "1" },
          cache: "no-store",
        }),
      ]);

      if (analyticsRes.ok) {
        const json = await analyticsRes.json();
        if (json.success && json.analytics) {
          setData(json.analytics);
        }
      }

      if (expRes.ok) {
        const json = await expRes.json();
        if (json.success && Array.isArray(json.experiments)) {
          setExperiments(json.experiments);
        }
      }
    } catch (e) {
      console.error("[AdminAnalyticsTab] Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleUpdateExperimentWinner = async (expId: string, winner: "A" | "B" | "none") => {
    setUpdatingExpId(expId);
    try {
      const res = await fetch("/api/admin/experiments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zovik-admin-request": "1",
        },
        body: JSON.stringify({ id: expId, winner }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.experiment) {
          setExperiments((prev) =>
            prev.map((e) => (e.id === expId ? json.experiment : e))
          );
        }
      }
    } catch (e) {
      console.error("Failed to update experiment:", e);
    } finally {
      setUpdatingExpId(null);
    }
  };

  const revenueToShowPKR =
    timeRange === "7d"
      ? data?.revenue.last7DaysPKR || 0
      : timeRange === "30d"
      ? data?.revenue.last30DaysPKR || 0
      : data?.revenue.totalApprovedPKR || 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-[10px] font-black uppercase tracking-wider">
              Phase 4 Intelligence
            </span>
            <span className="flex items-center space-x-1 text-emerald-400 text-xs font-bold">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Telemetry Live</span>
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Platform Analytics & Intelligence</h2>
          <p className="text-xs text-[#aeaeae]">
            Real-time companion popularity, revenue burn, user cohorts, and promo ROI engine.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Time range pills */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setTimeRange("7d")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeRange === "7d"
                  ? "bg-[#f53b70] text-white shadow-md shadow-pink-500/20"
                  : "text-[#aeaeae] hover:text-white"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange("30d")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeRange === "30d"
                  ? "bg-[#f53b70] text-white shadow-md shadow-pink-500/20"
                  : "text-[#aeaeae] hover:text-white"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeRange === "all"
                  ? "bg-[#f53b70] text-white shadow-md shadow-pink-500/20"
                  : "text-[#aeaeae] hover:text-white"
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Revenue PKR */}
        <div className="p-5 rounded-2xl bg-[#140b1c]/90 border border-pink-500/20 relative overflow-hidden group hover:border-pink-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#aeaeae] uppercase tracking-wider">
              {timeRange === "7d" ? "7D Revenue" : timeRange === "30d" ? "30D Revenue" : "Total Revenue"}
            </span>
            <div className="size-8 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">
              Rs. {revenueToShowPKR.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-pink-400">PKR</span>
          </div>
          <p className="text-[11px] text-[#aeaeae] mt-2 flex items-center space-x-1">
            <TrendingUp className="size-3 text-emerald-400 inline" />
            <span className="text-emerald-400 font-bold">~${Math.round(revenueToShowPKR / 278)} USD</span>
            <span>({data?.revenue.approvedCount || 0} approved payments)</span>
          </p>
        </div>

        {/* Active Chat Messages */}
        <div className="p-5 rounded-2xl bg-[#140b1c]/90 border border-sky-500/20 relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#aeaeae] uppercase tracking-wider">
              Total Messages
            </span>
            <div className="size-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <MessageSquare className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">
              {(data?.activity.totalChatMessages || 0).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-sky-400">Chats</span>
          </div>
          <p className="text-[11px] text-[#aeaeae] mt-2">
            ~{(data?.activity.avgSessionMinutes || 14).toFixed(1)} mins avg engagement
          </p>
        </div>

        {/* Coins In Circulation & Burn */}
        <div className="p-5 rounded-2xl bg-[#140b1c]/90 border border-amber-500/20 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#aeaeae] uppercase tracking-wider">
              Coin Velocity
            </span>
            <div className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">
              {(data?.activity.coinsInCirculation || 0).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-400">🪙 circulating</span>
          </div>
          <p className="text-[11px] text-[#aeaeae] mt-2 text-amber-300 font-bold">
            🔥 {(data?.activity.coinsBurned24h || 0).toLocaleString()} coins burned in 24h
          </p>
        </div>

        {/* Active Users & System Health */}
        <div className="p-5 rounded-2xl bg-[#140b1c]/90 border border-purple-500/20 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#aeaeae] uppercase tracking-wider">
              Real-Time Users
            </span>
            <div className="size-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">
              {data?.activity.estimatedActiveUsers || 0}
            </span>
            <span className="text-xs font-bold text-emerald-400">● Live Now</span>
          </div>
          <p className="text-[11px] text-[#aeaeae] mt-2">
            {data?.activity.totalRegisteredUsers || 0} registered ({data?.systemHealth.groqPoolKeysCount || 1} Groq pool keys)
          </p>
        </div>
      </div>

      {/* Main Split: Top Companions Leaderboard & User Cohorts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Companions Leaderboard (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#140b1c]/80 border border-white/10 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Award className="size-5 text-amber-400" />
                <span>Top Companions & Character Ranking</span>
              </h3>
              <p className="text-xs text-[#aeaeae]">
                Ranked by user retention score, message velocity, and engagement ratings.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-xl border border-purple-500/20">
              {data?.topCompanions.length || 0} Companions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#aeaeae] uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Companion</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right">Chat Sessions</th>
                  <th className="pb-3 text-right">Messages</th>
                  <th className="pb-3 text-right">Likes</th>
                  <th className="pb-3 text-right pr-2">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(data?.topCompanions || []).slice(0, 7).map((c, idx) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5 pl-2 font-black text-sm">
                      {idx === 0 ? (
                        <span className="text-amber-400">🥇 1</span>
                      ) : idx === 1 ? (
                        <span className="text-slate-300">🥈 2</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600">🥉 3</span>
                      ) : (
                        <span className="text-[#aeaeae]">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center space-x-3">
                        <img
                          src={c.image || "/characters/zovik_01.jpg"}
                          alt={c.name}
                          className="size-9 rounded-xl object-cover border border-white/10 shadow-sm"
                        />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-white group-hover:text-pink-400 transition-colors">
                              {c.name}
                            </span>
                            {c.isVipOnly && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-400 text-[9px] font-black">
                                VIP
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#aeaeae] line-clamp-1">
                            {c.tagline}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/80 font-medium">
                        {c.category}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-bold text-white">
                      {c.chatCount.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right text-sky-400 font-bold">
                      {c.messageCount.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right text-pink-400 font-bold">
                      ❤️ {c.likesCount}
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <div className="inline-flex items-center space-x-1.5">
                        <span className="font-black text-emerald-400">{c.engagementScore}%</span>
                        <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-emerald-400"
                            style={{ width: `${c.engagementScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Segmentation & Cohorts (1 Col) */}
        <div className="p-6 rounded-3xl bg-[#140b1c]/80 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Layers className="size-5 text-purple-400" />
                <span>User Segments & Cohorts</span>
              </h3>
              <p className="text-xs text-[#aeaeae]">
                Targeted audiences for high-converting campaigns.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(data?.userCohorts || []).map((cohort) => (
              <div
                key={cohort.id}
                className="p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase"
                      style={{
                        backgroundColor: `${cohort.accentColor}20`,
                        color: cohort.accentColor,
                        border: `1px solid ${cohort.accentColor}40`,
                      }}
                    >
                      {cohort.badge}
                    </span>
                    <span className="text-xs font-bold text-white">{cohort.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-white">{cohort.count} users</span>
                    <span className="text-[10px] text-[#aeaeae] ml-1">({cohort.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(5, cohort.percentage)}%`,
                      backgroundColor: cohort.accentColor,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[#aeaeae] line-clamp-1">
                    {cohort.recommendedAction}
                  </span>
                  {onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab("engagement")}
                      className="text-[10px] font-bold text-pink-400 hover:text-pink-300 flex items-center shrink-0 ml-2"
                    >
                      <span>Alert</span>
                      <ChevronRight className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Promo Code ROI Breakdown Table */}
      <div className="p-6 rounded-3xl bg-[#140b1c]/80 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white flex items-center space-x-2">
              <Gift className="size-5 text-pink-400" />
              <span>Promo Code Redemption & Financial ROI</span>
            </h3>
            <p className="text-xs text-[#aeaeae]">
              Direct financial attribution showing coupon usage vs revenue captured.
            </p>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab("offers")}
              className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center space-x-1"
            >
              <span>Manage Codes</span>
              <ChevronRight className="size-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[#aeaeae] uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-2">Promo Code</th>
                <th className="pb-3">Title / Campaign</th>
                <th className="pb-3">Benefit</th>
                <th className="pb-3 text-right">Redemptions</th>
                <th className="pb-3 text-right">Est. Discount</th>
                <th className="pb-3 text-right">Gross Revenue</th>
                <th className="pb-3 text-right pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(data?.promoROI || []).map((p) => (
                <tr key={p.code} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 pl-2 font-mono font-black text-pink-400">
                    {p.code}
                  </td>
                  <td className="py-3.5 text-white font-medium">{p.title}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                      {p.discount}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-bold text-white">
                    {p.redemptionsCount.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-right text-rose-400 font-bold">
                    -Rs. {p.estimatedDiscountPKR.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-right text-emerald-400 font-black">
                    +Rs. {p.estimatedRevenuePKR.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.isActive
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                          : "bg-white/5 text-[#aeaeae]"
                      }`}
                    >
                      {p.isActive ? "Active" : "Paused"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* A/B Testing & Conversion Experiments */}
      <div className="p-6 rounded-3xl bg-[#140b1c]/80 border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white flex items-center space-x-2">
              <Split className="size-5 text-indigo-400" />
              <span>A/B Conversion Testing Experiments</span>
            </h3>
            <p className="text-xs text-[#aeaeae]">
              Scientific headline, modal, and pricing split tests running in production.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl border border-indigo-500/20">
            {experiments.length} Active Tests
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {experiments.map((exp) => {
            const totalImpr = exp.variantA.impressions + exp.variantB.impressions;
            const rateA =
              exp.variantA.impressions > 0
                ? ((exp.variantA.conversions / exp.variantA.impressions) * 100).toFixed(1)
                : "0.0";
            const rateB =
              exp.variantB.impressions > 0
                ? ((exp.variantB.conversions / exp.variantB.impressions) * 100).toFixed(1)
                : "0.0";

            return (
              <div
                key={exp.id}
                className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-white">{exp.name}</h4>
                    <p className="text-xs text-[#aeaeae] mt-0.5">{exp.description}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold text-indigo-400">
                      Metric: {exp.metric}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase shrink-0">
                    {exp.status}
                  </span>
                </div>

                {/* Variants Side-by-Side Comparison */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {/* Variant A */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      exp.winner === "A"
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-sky-400">Variant A</span>
                      {exp.winner === "A" && (
                        <span className="text-emerald-400 text-[10px] font-black">🏆 Winner</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-white mt-1 line-clamp-2">
                      {exp.variantA.label}
                    </p>
                    <div className="mt-3 flex items-baseline justify-between border-t border-white/5 pt-2">
                      <span className="text-lg font-black text-white">{rateA}%</span>
                      <span className="text-[10px] text-[#aeaeae]">
                        {exp.variantA.conversions}/{exp.variantA.impressions}
                      </span>
                    </div>
                  </div>

                  {/* Variant B */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      exp.winner === "B"
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-purple-400">Variant B</span>
                      {exp.winner === "B" && (
                        <span className="text-emerald-400 text-[10px] font-black">🏆 Winner</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-white mt-1 line-clamp-2">
                      {exp.variantB.label}
                    </p>
                    <div className="mt-3 flex items-baseline justify-between border-t border-white/5 pt-2">
                      <span className="text-lg font-black text-white">{rateB}%</span>
                      <span className="text-[10px] text-[#aeaeae]">
                        {exp.variantB.conversions}/{exp.variantB.impressions}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Winner Picker Button */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                  <span className="text-[11px] text-[#aeaeae]">Select 100% Winner:</span>
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => handleUpdateExperimentWinner(exp.id, "A")}
                      disabled={updatingExpId === exp.id}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        exp.winner === "A"
                          ? "bg-emerald-500 text-white"
                          : "bg-white/5 hover:bg-white/10 text-[#aeaeae]"
                      }`}
                    >
                      Rollout A
                    </button>
                    <button
                      onClick={() => handleUpdateExperimentWinner(exp.id, "B")}
                      disabled={updatingExpId === exp.id}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        exp.winner === "B"
                          ? "bg-emerald-500 text-white"
                          : "bg-white/5 hover:bg-white/10 text-[#aeaeae]"
                      }`}
                    >
                      Rollout B
                    </button>
                    <button
                      onClick={() => handleUpdateExperimentWinner(exp.id, "none")}
                      disabled={updatingExpId === exp.id}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        exp.winner === "none" || !exp.winner
                          ? "bg-white/15 text-white"
                          : "bg-white/5 hover:bg-white/10 text-[#aeaeae]"
                      }`}
                    >
                      Split 50/50
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
