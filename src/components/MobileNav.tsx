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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-[#0d0a0f]/95 backdrop-blur-xl border-t border-white/10 z-50 flex items-center justify-center px-4 select-none shadow-2xl">
      <div className="w-full max-w-lg flex items-center justify-between">
      <button
        onClick={() => setActiveTab("home")}
        className={`flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-all active:scale-95 ${
          activeTab === "home" ? "text-[#f53b70]" : "text-[#aeaeae] hover:text-white"
        }`}
        title="Home"
      >
        <Home className={`size-5 ${activeTab === "home" ? "drop-shadow-[0_0_8px_rgba(245,59,112,0.6)]" : ""}`} />
        <span className="text-[10px] font-semibold mt-1">Home</span>
      </button>

      <button
        onClick={() => setActiveTab("shorts")}
        className={`flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-all active:scale-95 ${
          activeTab === "shorts" ? "text-[#f53b70]" : "text-[#aeaeae] hover:text-white"
        }`}
        title="Shorts"
      >
        <Film className={`size-5 ${activeTab === "shorts" ? "drop-shadow-[0_0_8px_rgba(245,59,112,0.6)]" : ""}`} />
        <span className="text-[10px] font-semibold mt-1">Shorts</span>
      </button>

      {/* Center Create Button */}
      <button
        onClick={openCreateModal}
        className="flex flex-col items-center justify-center -mt-6 size-12 rounded-full bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] text-white shadow-lg shadow-pink-500/40 active:scale-90 transition-transform ring-4 ring-[#0d0a0f]"
        title="Create Companion"
      >
        <Sparkles className="size-6 drop-shadow-sm" />
      </button>

      <button
        onClick={() => setActiveTab("chat")}
        className={`relative flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-all active:scale-95 ${
          activeTab === "chat" ? "text-[#f53b70]" : "text-[#aeaeae] hover:text-white"
        }`}
        title="Chat"
      >
        <div className="relative">
          <MessageCircle className={`size-5 ${activeTab === "chat" ? "drop-shadow-[0_0_8px_rgba(245,59,112,0.6)]" : ""}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 size-4 rounded-full bg-[#f53b70] text-white text-[9px] font-black flex items-center justify-center shadow-sm">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold mt-1">Chat</span>
      </button>

      <button
        onClick={openPremiumModal}
        className="flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-all active:scale-95 text-amber-400 hover:text-amber-300"
        title="Coin Store"
      >
        <Coins className="size-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
        <span className="text-[10px] font-black mt-1 text-amber-300">Coins</span>
      </button>
      </div>
    </nav>
  );
}
