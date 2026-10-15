"use client";

import React, { useState } from "react";
import {
  Sliders,
  ShieldAlert,
  Zap,
  Coins,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Flame,
  Sparkles,
} from "lucide-react";
import { FeatureFlag, FeatureFlagCategory } from "@/types";

interface AdminFeatureFlagsTabProps {
  flags: FeatureFlag[];
  onRefresh: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export const AdminFeatureFlagsTab: React.FC<AdminFeatureFlagsTabProps> = ({
  flags,
  onRefresh,
  getAuthHeaders,
}) => {
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const categories: { id: FeatureFlagCategory; label: string; icon: React.ElementType; color: string }[] = [
    { id: "features", label: "Core App Features", icon: Sparkles, color: "#f53b70" },
    { id: "system", label: "System & Safety Kill-Switches", icon: ShieldAlert, color: "#ef4444" },
    { id: "monetization", label: "Monetization & Economy", icon: Coins, color: "#eab308" },
    { id: "ai", label: "AI Models & Intelligence", icon: Cpu, color: "#8b5cf6" },
  ];

  const handleToggle = async (flag: FeatureFlag) => {
    setTogglingKey(flag.key);
    setStatusMsg(null);

    const newStatus = !flag.enabled;
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          key: flag.key,
          enabled: newStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({
          type: "success",
          text: `Flag '${flag.name}' turned ${newStatus ? "ON ✅" : "OFF ⛔"} instantly across all servers.`,
        });
        onRefresh();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to update feature flag." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error while toggling flag." });
    } finally {
      setTogglingKey(null);
    }
  };

  const activeCount = flags.filter((f) => f.enabled).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center space-x-3">
          <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Zap className="size-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{activeCount} / {flags.length}</div>
            <div className="text-[11px] text-[#aeaeae]">Active Flags</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center space-x-3">
          <div className="size-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">
              {flags.find((f) => f.key === "maintenance_mode")?.enabled ? "ACTIVE (Maintenance)" : "OFF (Normal)"}
            </div>
            <div className="text-[11px] text-[#aeaeae]">Emergency Maintenance Switch</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#140b1a] border border-white/5 flex items-center space-x-3">
          <div className="size-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Sliders className="size-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">Zero Deployment</div>
            <div className="text-[11px] text-[#aeaeae]">Instant Cloud Sync (Supabase + Local)</div>
          </div>
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

      {/* Feature Flags Categories */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const categoryFlags = flags.filter((f) => f.category === cat.id);
          if (categoryFlags.length === 0) return null;
          const Icon = cat.icon;

          return (
            <div key={cat.id} className="rounded-2xl bg-[#140b1a] border border-white/5 p-4 sm:p-6 space-y-4">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-white/5">
                <div
                  className="size-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: `${cat.color}25` }}
                >
                  <Icon className="size-4" style={{ color: cat.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{cat.label}</h3>
                  <p className="text-[11px] text-[#888]">Instant runtime toggles and kill-switches</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {categoryFlags.map((flag) => {
                  const isBusy = togglingKey === flag.key;
                  const isMaintenance = flag.key === "maintenance_mode";

                  return (
                    <div
                      key={flag.key}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                        flag.enabled
                          ? isMaintenance
                            ? "bg-red-500/10 border-red-500/30 shadow-sm"
                            : "bg-white/[0.03] border-white/10 hover:border-white/20"
                          : "bg-black/20 border-white/5 opacity-70 hover:opacity-90"
                      }`}
                    >
                      <div className="space-y-1 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">{flag.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                              flag.enabled
                                ? isMaintenance
                                  ? "bg-red-500 text-white animate-pulse"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-white/10 text-white/40"
                            }`}
                          >
                            {flag.enabled ? "ACTIVE" : "DISABLED"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#aeaeae] line-clamp-2">{flag.description}</p>
                        <div className="text-[9px] font-mono text-[#666]">key: {flag.key}</div>
                      </div>

                      <button
                        onClick={() => handleToggle(flag)}
                        disabled={isBusy}
                        className={`p-1.5 rounded-xl transition-all shrink-0 active:scale-95 ${
                          flag.enabled
                            ? isMaintenance
                              ? "bg-red-500 text-white hover:brightness-110"
                              : "bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white shadow-md shadow-pink-600/30"
                            : "bg-white/10 text-[#888] hover:bg-white/20 hover:text-white"
                        }`}
                        title={flag.enabled ? "Turn Off" : "Turn On"}
                      >
                        {flag.enabled ? (
                          <ToggleRight className="size-6 text-white" />
                        ) : (
                          <ToggleLeft className="size-6 text-white/60" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
