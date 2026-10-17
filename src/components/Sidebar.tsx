"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  Home,
  Compass,
  Film,
  MessageCircle,
  FolderHeart,
  Sparkles,
  UserCheck,
  Lock,
  Crown,
  HelpCircle,
  Globe,
  Coins,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { setLanguage, LanguageCode } from "@/lib/translations";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openPremiumModal: () => void;
  openCreateModal: () => void;
  unreadCount?: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  openPremiumModal,
  openCreateModal,
  unreadCount = 0,
}: SidebarProps) {
  const { tier: authTier } = useAuth();
  const { balance: walletBalance } = useWallet();
  const [currentLang, setCurrentLang] = useLocalStorage<string>("zovik_lang", "ur");
  const [isCoinsFolded, setIsCoinsFolded] = useLocalStorage<boolean>("zovik_sidebar_coins_folded", false);

  const isVip = authTier === "vip";
  const isPlus = authTier === "plus";

  const handleLangChange = (lang: string) => {
    setCurrentLang(lang);
    setLanguage(lang as LanguageCode);
  };

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "discover", label: "Discover", icon: Compass },
    { id: "shorts", label: "Shorts", icon: Film },
    { id: "chat", label: "Chat", icon: MessageCircle, badge: unreadCount },
    { id: "collection", label: "Collection", icon: FolderHeart },
    { id: "create", label: "Create Companion", icon: Sparkles, action: openCreateModal },
    { id: "my-ai", label: "My AI", icon: UserCheck },
    { id: "private", label: "Private Content", icon: Lock },
  ];

  return (
    <aside className="hidden lg:flex flex-col justify-between w-60 h-[100dvh] sticky top-0 bg-[#0d0a0f] border-r border-white/5 p-4 z-40 select-none overflow-y-auto no-scrollbar">
      <div className="flex flex-col space-y-6">
        {/* Brand Logo — links back to Landing Page */}
        <Link
          href="/"
          className="flex items-center space-x-2.5 px-3 py-2 cursor-pointer group"
          title="Back to Zovik AI Home"
        >
          <div className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-xl overflow-hidden relative shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform flex-shrink-0 flex items-center justify-center bg-[#0d0a0f]">
            <Image src="/favicon.svg" alt="Zovik AI" width={36} height={36} className="w-full h-full object-contain" priority />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-wide text-white">
              ZOVIK<span className="text-[#f53b70]">.AI</span>
            </span>
            <span className="block text-[10px] text-[#aeaeae] tracking-widest font-semibold uppercase -mt-1">
              AI Companions
            </span>
          </div>
        </Link>

        {/* Navigation List */}
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`relative flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-[#1f1528] text-white shadow-sm border border-white/5"
                    : "text-[#aeaeae] hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon
                    className={`size-4.5 shrink-0 transition-colors ${
                      isActive ? "text-[#f53b70]" : "text-[#aeaeae] group-hover:text-white"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.id === "create" ? (
                  <span className="shrink-0 ml-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black tracking-tight shadow-sm">
                    🪙 100
                  </span>
                ) : item.badge && item.badge > 0 ? (
                  <span className="shrink-0 ml-1.5 size-5 rounded-full bg-[#f53b70] text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Official Coins Economy Banner */}
        {walletBalance <= 0 ? (
          /* Empty Wallet Alert State (Prominent when user has 0 coins) */
          <div className="relative overflow-hidden p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/70 via-[#1c0d18]/90 to-[#120716] border border-amber-500/40 backdrop-blur-md transition-all group shadow-xl shadow-amber-950/30 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <div
                onClick={openPremiumModal}
                className="flex items-center space-x-1.5 cursor-pointer"
              >
                <Coins className="size-4 text-amber-400 animate-pulse shrink-0" />
                <span className="text-xs font-black tracking-wide text-amber-300 uppercase">Recharge Required</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] font-black tracking-wider">
                0 COINS
              </span>
            </div>

            <p className="text-[10px] text-amber-200/80 leading-tight mb-2.5">
              Aapke paas coins khatam ho chuke hain. Chat aur private photos ke liye recharge karein.
            </p>

            <button
              onClick={openPremiumModal}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black text-xs font-black hover:brightness-110 transition-all shadow-md shadow-amber-500/30 flex items-center justify-center space-x-1 active:scale-98"
            >
              <Coins className="size-3.5" />
              <span>Recharge Coins 🪙</span>
            </button>
          </div>
        ) : isCoinsFolded ? (
          /* Minimal Clean Badge when user has active coins and prefers folded */
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-[#170e20] to-[#120a1a] border border-amber-500/25 hover:border-amber-400/45 transition-all shadow-md group">
            <button
              onClick={openPremiumModal}
              className="flex items-center space-x-2 min-w-0 text-left hover:opacity-90 transition-opacity"
              title="Click to view Coins"
            >
              <Coins className="size-4 text-amber-400 shrink-0 group-hover:rotate-12 transition-transform" />
              <span className="text-xs font-black text-amber-300 truncate">
                🪙 {walletBalance.toLocaleString()} <span className="text-[10px] font-medium text-amber-200/60">Coins</span>
              </span>
            </button>
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={openPremiumModal}
                title="Add More Coins"
                className="size-6 rounded-md bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-300 flex items-center justify-center transition-all active:scale-95"
              >
                <Plus className="size-3 font-bold" />
              </button>
              <button
                onClick={() => setIsCoinsFolded(false)}
                title="Expand Wallet Card"
                className="size-6 rounded-md bg-white/5 hover:bg-white/10 text-[#aeaeae] hover:text-white flex items-center justify-center transition-all"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Sleek Active Wallet Card (Collapsible by user) */
          <div className="relative overflow-hidden p-3 rounded-2xl bg-gradient-to-br from-[#1a1024]/90 via-[#140b1c]/85 to-[#0d0714] border border-amber-500/30 hover:border-amber-400/50 backdrop-blur-md transition-all group shadow-lg shadow-amber-950/20">
            <div className="flex items-center justify-between mb-1.5">
              <div
                onClick={openPremiumModal}
                className="flex items-center space-x-1.5 cursor-pointer"
              >
                <Coins className="size-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span className="text-xs font-black tracking-wide text-amber-300 uppercase">My Wallet</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9px] font-black tracking-wider">
                  ACTIVE
                </span>
                <button
                  onClick={() => setIsCoinsFolded(true)}
                  title="Minimize Wallet Card"
                  className="size-5 rounded-md bg-white/5 hover:bg-white/15 text-[#aeaeae] hover:text-white flex items-center justify-center transition-colors"
                >
                  <ChevronUp className="size-3" />
                </button>
              </div>
            </div>

            <div
              onClick={openPremiumModal}
              className="flex items-baseline space-x-1.5 mb-2 cursor-pointer"
            >
              <span className="text-xl font-black text-amber-400">
                🪙 {walletBalance.toLocaleString()}
              </span>
              <span className="text-[11px] text-[#aeaeae] font-semibold">Coins</span>
            </div>

            <button
              onClick={openPremiumModal}
              className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-xs font-bold hover:border-amber-500/40 transition-all flex items-center justify-center space-x-1.5 active:scale-98"
            >
              <Plus className="size-3 text-amber-400" />
              <span>Add Coins</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer / Meta */}
      <div className="flex flex-col space-y-3 pt-4 border-t border-white/5 text-xs text-[#aeaeae]">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-1.5 bg-white/5 px-2 py-1 rounded-lg text-white/90">
            <Globe className="size-3.5 text-[#f53b70]" />
            <select
              value={currentLang}
              onChange={(e) => handleLangChange(e.target.value)}
              aria-label="Select Interface Language"
              className="bg-transparent text-[11px] font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="ur" className="bg-[#17101e] text-white">Roman Urdu</option>
              <option value="en" className="bg-[#17101e] text-white">English</option>
            </select>
          </div>
          <button
            onClick={() => {
              setActiveTab("home");
              setTimeout(() => {
                const el = document.getElementById("faq-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            className="flex items-center space-x-1.5 hover:text-white transition-colors"
          >
            <HelpCircle className="size-3.5 text-[#f53b70]" />
            <span className="text-[11px] font-semibold">Help & FAQ</span>
          </button>
        </div>
        <div className="text-[10px] text-center text-white/30">© 2026 Zovik AI. All rights reserved.</div>
      </div>
    </aside>
  );
}
