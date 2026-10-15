"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Flame, Clock, ArrowRight, X } from "lucide-react";
import { SmartBannerConfig } from "@/types";

export default function SmartBanner() {
  const [banner, setBanner] = useState<SmartBannerConfig | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    fetch("/api/engagement/banner", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.banner && data.banner.isActive) {
          const dismissedUntil = localStorage.getItem(`zovik_banner_dismissed_${data.banner.id}`);
          if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
            setIsDismissed(true);
          } else {
            setBanner(data.banner);
            setIsDismissed(false);
          }
        }
      })
      .catch((err) => console.warn("[SmartBanner] Fetch note:", err));
  }, []);

  // Countdown timer tick
  useEffect(() => {
    if (!banner?.countdownTarget) return;

    const targetTime = new Date(banner.countdownTarget).getTime();

    const updateTimer = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [banner?.countdownTarget]);

  const handleDismiss = () => {
    if (!banner) return;
    setIsDismissed(true);
    // Dismiss for 24 hours
    localStorage.setItem(
      `zovik_banner_dismissed_${banner.id}`,
      String(Date.now() + 24 * 60 * 60 * 1000)
    );
  };

  if (!banner || isDismissed || !banner.isActive) {
    return null;
  }

  return (
    <aside
      aria-label="Promotional announcement"
      className="relative z-40 w-full bg-gradient-to-r from-[#170a1e] via-[#290d24] to-[#170a1e] border-b border-pink-500/20 text-white px-3 py-2 text-xs transition-all shadow-md"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left Badge & Content */}
        <div className="flex items-center space-x-2.5 overflow-hidden">
          {banner.badge && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-[10px] font-black uppercase text-white shadow-sm shadow-pink-600/30">
              {banner.badge}
            </span>
          )}

          <div className="flex items-center space-x-2 truncate">
            {banner.highlightText && (
              <span className="hidden sm:inline text-amber-300 font-black tracking-wide shrink-0">
                ⚡ {banner.highlightText}:
              </span>
            )}
            <span className="truncate font-medium text-white/90">
              {banner.title}
            </span>
          </div>
        </div>

        {/* Right CTA & Countdown & Close */}
        <div className="flex items-center space-x-3 shrink-0">
          {timeLeft && (
            <div className="hidden md:flex items-center space-x-1 font-mono text-[11px] font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded-lg border border-amber-500/30">
              <Clock className="size-3 text-amber-400" />
              <span>
                {String(timeLeft.hours).padStart(2, "0")}h:
                {String(timeLeft.minutes).padStart(2, "0")}m:
                {String(timeLeft.seconds).padStart(2, "0")}s
              </span>
            </div>
          )}

          {banner.ctaText && banner.ctaLink && (
            <Link
              href={banner.ctaLink}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-extrabold flex items-center space-x-1 transition-all active:scale-95 group"
            >
              <span>{banner.ctaText}</span>
              <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}

          {banner.isDismissible && (
            <button
              onClick={handleDismiss}
              className="size-5 rounded-md hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              title="Dismiss announcement"
              aria-label="Dismiss banner"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
