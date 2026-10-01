"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
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
} from "lucide-react";

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
  const [currentLang, setCurrentLang] = useState("ur");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zovik_lang") || "ur";
      setCurrentLang(saved);
    }
  }, []);

  const handleLangChange = (lang: string) => {
    setCurrentLang(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("zovik_lang", lang);
      window.dispatchEvent(new CustomEvent("zovik_lang_changed", { detail: { lang } }));
    }
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
    <aside className="hidden lg:flex flex-col justify-between w-60 h-screen sticky top-0 bg-[#0d0a0f] border-r border-white/5 p-4 z-40 select-none">
      <div className="flex flex-col space-y-6">
        {/* Brand Logo — links back to Landing Page */}
        <Link
          href="/"
          className="flex items-center space-x-2.5 px-3 py-2 cursor-pointer group"
          title="Back to Zovik AI Home"
        >
          <div className="size-9 rounded-xl overflow-hidden relative shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <Image src="/favicon.svg" alt="Zovik AI" fill className="object-cover" priority />
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
        <a
          href="/"
          className="mx-3 -mt-4 mb-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-pink-400 hover:text-white border border-white/5 flex items-center justify-between transition-all"
        >
          <span>← Zovik Labs</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 uppercase tracking-wider font-mono">Home</span>
        </a>

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
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`size-5 transition-colors ${
                      isActive ? "text-[#f53b70]" : "text-[#aeaeae] group-hover:text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.id === "create" ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[9px] font-black uppercase tracking-wider shadow-sm">
                    VIP
                  </span>
                ) : item.badge && item.badge > 0 ? (
                  <span className="size-5 rounded-full bg-[#f53b70] text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Premium Upgrade Banner */}
        <div
          onClick={openPremiumModal}
          className="relative overflow-hidden p-3.5 rounded-2xl bg-gradient-to-br from-[#2a1335] via-[#1a0f24] to-[#120a1a] border border-[#f53b70]/30 hover:border-[#f53b70]/60 transition-all cursor-pointer group shadow-lg shadow-pink-950/20"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Crown className="size-4 text-[#f53b70]" />
              <span className="text-xs font-black tracking-wide text-white uppercase">Premium</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full bg-[#f53b70] text-white text-[10px] font-black tracking-wider">
              -70% OFF
            </span>
          </div>
          <p className="text-[11px] text-[#cbb6bf] leading-tight mb-2.5">
            Unlimited chat, voice calls & HD unblurred character photos.
          </p>
          <button className="w-full py-1.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white text-xs font-bold hover:brightness-110 transition-all">
            Upgrade Now
          </button>
        </div>
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
