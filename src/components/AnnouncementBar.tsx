"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { AnnouncementConfig } from "@/types";

export function AnnouncementBar() {
  const [config, setConfig] = useState<AnnouncementConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchAnnouncement = () => {
    fetch("/api/announcement", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.announcement) {
          setConfig(data.announcement);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    // Clean up any old persistent dismissal blockers from previous sessions
    try {
      sessionStorage.removeItem("zovik_announcement_dismissed");
      localStorage.removeItem("zovik_announcement_dismissed");
    } catch {}

    // Fetch initial live announcement
    fetchAnnouncement();

    // Listen for live updates from admin panel or other tabs
    const handleAnnouncementUpdated = () => {
      setDismissed(false); // Reset dismissal on any new admin update
      fetchAnnouncement();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "zovik_announcement_updated_at") {
        setDismissed(false);
        fetchAnnouncement();
      }
    };

    window.addEventListener("zovik_announcement_updated", handleAnnouncementUpdated);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", fetchAnnouncement);

    return () => {
      window.removeEventListener("zovik_announcement_updated", handleAnnouncementUpdated);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", fetchAnnouncement);
    };
  }, []);

  if (dismissed || !config || !config.enabled || !config.text || pathname?.startsWith("/admin")) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Dismiss in-memory for the current view session so navigation between pages stays clean,
    // but on page refresh (F5), app reopen, or new announcement from admin, it shows again!
    setDismissed(true);
  };

  const handleClick = () => {
    if (config.actionType === "custom_link" && config.linkUrl) {
      router.push(config.linkUrl);
      return;
    }

    // Default action: Open Premium Modal
    if (pathname === "/app") {
      window.dispatchEvent(new CustomEvent("open-premium-modal"));
    } else {
      router.push("/app?openPremium=true");
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative z-40 w-full cursor-pointer bg-gradient-to-r from-[#e11d48] via-[#a855f7] to-[#f59e0b] text-white shadow-lg shadow-pink-500/10 transition-all hover:brightness-110 group select-none overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold">
        {/* Left Badge & Marquee/Text */}
        <div className="flex items-center space-x-2.5 overflow-hidden flex-1">
          {config.badge && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-black tracking-wider uppercase text-yellow-300 animate-pulse shadow-sm">
              {config.badge}
            </span>
          )}

          <div className="truncate flex items-center space-x-1.5 font-medium tracking-wide">
            <Sparkles className="size-3.5 text-yellow-300 shrink-0 hidden sm:inline-block" />
            <span className="truncate">{config.text}</span>
          </div>
        </div>

        {/* Right CTA & Dismiss */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="hidden md:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-white/20 group-hover:bg-white/30 text-white font-bold text-[11px] backdrop-blur-md transition-all">
            <span>Unlock Now</span>
            <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>

          <button
            onClick={handleDismiss}
            title="Dismiss announcement"
            className="size-6 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
