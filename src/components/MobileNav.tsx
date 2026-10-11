"use client";

import React from "react";
import { Home, Film, MessageCircle, Sparkles, User, Coins } from "lucide-react";

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openCreateModal: () => void;
  openPremiumModal: () => void;
  unreadCount?: number;
}

export default function MobileNav({
  activeTab,
  setActiveTab,
  openCreateModal,
  openPremiumModal,
  unreadCount = 0,
}: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-[#0d0a0f]/90 backdrop-blur-xl border-t border-white/10 z-50 flex items-center justify-around px-2 pb-safe select-none">
      <button
        onClick={() => setActiveTab("home")}
        className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
          activeTab === "home" ? "text-[#f53b70]" : "text-[#aeaeae] hover:text-white"
        }`}
      >
        <Home className="size-5" />
        <span className="text-[10px] font-medium mt-1">Home</span>
      </button>

      <button
        onClick={() => setActiveTab("shorts")}
        className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
          activeTab === "shorts" ? "text-[#f53b70]" : "text-[#aeaeae] hover:text-white"
        }`}
      >
        <Film className="size-5" />
        <span className="text-[10px] font-medium mt-1">Shorts</span>
      </button>

      {/* Center Create Button */}
      <button
        onClick={openCreateModal}
        className="flex flex-col items-center justify-center -mt-5 size-12 rounded-full bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] text-white shadow-lg shadow-pink-500/30 active:scale-95 transition-transform"
      >
        <Sparkles className="size-6" />
      </button>

      <button
        onClick={() => setActiveTab("chat")}
        className={`relative flex flex-col items-center justify-center w-14 py-1 transition-colors ${
          activeTab === "chat" ? "text-[#f53b70]" : "text-[#aeaeae] hover:text-white"
        }`}
      >
        <div className="relative">
          <MessageCircle className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 size-4 rounded-full bg-[#f53b70] text-white text-[9px] font-black flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium mt-1">Chat</span>
      </button>

      <button
        onClick={openPremiumModal}
        className="flex flex-col items-center justify-center w-14 py-1 transition-colors text-amber-400 hover:text-amber-300"
      >
        <Coins className="size-5 text-amber-400" />
        <span className="text-[10px] font-black mt-1 text-amber-300">Coins</span>
      </button>
    </nav>
  );
}
