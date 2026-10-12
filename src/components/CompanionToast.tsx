"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MessageCircle, X, Heart } from "lucide-react";
import { CompanionAlert } from "@/lib/notificationHelper";

export default function CompanionToast({ onOpenCompanion }: { onOpenCompanion?: (name: string) => void }) {
  const [activeAlert, setActiveAlert] = useState<CompanionAlert | null>(null);

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent<CompanionAlert>;
      if (customEvent.detail) {
        setActiveAlert(customEvent.detail);

        // Auto-dismiss after 8 seconds
        const timer = setTimeout(() => {
          setActiveAlert(null);
        }, 8000);

        return () => clearTimeout(timer);
      }
    };

    window.addEventListener("zovik_companion_notification", handleNotification);
    return () => {
      window.removeEventListener("zovik_companion_notification", handleNotification);
    };
  }, []);

  if (!activeAlert) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-[#180e22]/95 backdrop-blur-xl border border-pink-500/40 rounded-2xl p-3.5 shadow-2xl shadow-pink-950/50 animate-bounceIn select-none">
      <div className="flex items-start space-x-3">
        {/* Companion Avatar with Online Pulse */}
        <div className="relative w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-xl overflow-hidden shrink-0 border border-pink-500/50 shadow-md">
          <Image
            src={activeAlert.avatar || "/logos/zovik-squircle.svg"}
            alt={activeAlert.companionName}
            width={48}
            height={48}
            className="w-full h-full object-cover"
            unoptimized
          />
          <div className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 border border-black animate-pulse" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-white flex items-center space-x-1 truncate">
              <span>{activeAlert.companionName}</span>
              <Heart className="size-3 fill-[#f53b70] text-[#f53b70] shrink-0" />
            </h4>
            <span className="text-[10px] text-[#aeaeae]">{activeAlert.time}</span>
          </div>

          <p className="text-xs text-[#eedee7] mt-0.5 line-clamp-2 leading-relaxed">
            &quot;{activeAlert.message}&quot;
          </p>

          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={() => {
                if (onOpenCompanion) onOpenCompanion(activeAlert.companionName);
                setActiveAlert(null);
              }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white text-[11px] font-black shadow-sm hover:brightness-110 active:scale-95 transition-all"
            >
              <MessageCircle className="size-3" />
              <span>Reply</span>
            </button>
            <button
              onClick={() => setActiveAlert(null)}
              className="text-[10px] font-medium text-[#aeaeae] hover:text-white px-1.5 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setActiveAlert(null)}
          className="size-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#aeaeae] hover:text-white transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
