"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Smartphone, LogIn, LogOut, User, X, Crown, Globe, Bell, Coins } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { getCurrentLanguage, setLanguage, getT, LanguageCode } from "@/lib/translations";
import { sendCompanionNotification } from "@/lib/notificationHelper";

interface HeaderProps {
  genderFilter: "female" | "male" | "anime";
  setGenderFilter: (filter: "female" | "male" | "anime") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  openLoginModal: () => void;
  openPremiumModal: () => void;
  openPwaModal: () => void;
  openProfileModal: () => void;
}

export default function Header({
  genderFilter,
  setGenderFilter,
  searchQuery,
  setSearchQuery,
  openLoginModal,
  openPremiumModal,
  openPwaModal,
  openProfileModal,
}: HeaderProps) {
  const { user: currentUser, userData, tier: currentTier, logout: onLogout, loading, isLocallyLoggedIn } = useAuth();
  const { balance: walletBalance } = useWallet();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [currentLang, setCurrentLangState] = useState<LanguageCode>("en");
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [notifSent, setNotifSent] = useState(false);

  useEffect(() => {
    setCurrentLangState(getCurrentLanguage());
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<LanguageCode>;
      if (customEvent.detail) {
        setCurrentLangState(customEvent.detail);
      }
    };
    window.addEventListener("zovik_lang_changed", handleLangChange);
    return () => window.removeEventListener("zovik_lang_changed", handleLangChange);
  }, []);

  const handleSelectLang = (lang: LanguageCode) => {
    setLanguage(lang);
    setCurrentLangState(lang);
    setIsLangMenuOpen(false);
  };

  const handleTriggerCompanionNotification = () => {
    sendCompanionNotification();
    setNotifSent(true);
    setTimeout(() => setNotifSent(false), 2500);
  };

  const t = getT(currentLang);

  return (
    <header className="sticky top-0 z-30 flex flex-col px-4 lg:px-8 py-3 bg-[#0d0a0f]/95 backdrop-blur-xl border-b border-white/5 transition-all">
      <div className="flex items-center justify-between">
        {/* Mobile Brand Title — links back to Landing Page */}
        <Link href="/" className="flex lg:hidden items-center space-x-2 group" title="Back to Zovik AI Home">
          <div className="size-8 rounded-lg overflow-hidden relative shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <Image src="/favicon.svg" alt="Zovik AI" fill className="object-cover" priority />
          </div>
          <span className="text-lg font-black text-white tracking-wide">
            ZOVIK<span className="text-[#f53b70]">.AI</span>
          </span>
        </Link>

        {/* Center Style Switcher: Girls, Boys, Anime */}
        <div className="flex items-center p-1 rounded-2xl bg-[#17101e] border border-white/10 shadow-inner">
          <button
            onClick={() => setGenderFilter("female")}
            className={`flex items-center space-x-1.5 px-3 md:px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-extrabold transition-all ${
              genderFilter === "female"
                ? "bg-[#f53b70] text-white shadow-md shadow-pink-600/30"
                : "text-[#cbb6bf] hover:text-white"
            }`}
          >
            <span>👩</span>
            <span className="hidden sm:inline">{t.girls}</span>
          </button>

          <button
            onClick={() => setGenderFilter("male")}
            className={`flex items-center space-x-1.5 px-3 md:px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-extrabold transition-all ${
              genderFilter === "male"
                ? "bg-[#f53b70] text-white shadow-md shadow-pink-600/30"
                : "text-[#cbb6bf] hover:text-white"
            }`}
          >
            <span>👨</span>
            <span className="hidden sm:inline">{t.boys}</span>
          </button>

          <button
            onClick={() => setGenderFilter("anime")}
            className={`flex items-center space-x-1.5 px-3 md:px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-extrabold transition-all ${
              genderFilter === "anime"
                ? "bg-[#f53b70] text-white shadow-md shadow-pink-600/30"
                : "text-[#cbb6bf] hover:text-white"
            }`}
          >
            <span>🌸</span>
            <span className="hidden sm:inline">{t.anime}</span>
          </button>
        </div>

        {/* Right Action Icons & Search */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile Search Toggle Icon */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="flex md:hidden size-8 rounded-xl bg-white/5 border border-white/10 items-center justify-center text-[#aeaeae] hover:text-white transition-colors"
            title="Search"
          >
            <Search className="size-4" />
          </button>

          {/* Desktop Search Input Box */}
          <div className="relative hidden md:flex items-center w-40 lg:w-56">
            <Search className="absolute left-3 size-4 text-[#aeaeae] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#17101e] border border-white/10 text-xs text-white placeholder-[#888] focus:outline-none focus:border-[#f53b70] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-[#aeaeae] hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Option 4: Language Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all active:scale-95"
              title="Change Language / زبان تبدیل کریں"
            >
              <Globe className="size-3.5 text-[#f53b70]" />
              <span className="uppercase text-[11px]">
                {currentLang === "ru" ? "Roman" : currentLang === "ur" ? "اردو" : "EN"}
              </span>
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-36 rounded-2xl bg-[#1a1124] border border-white/10 shadow-2xl p-1.5 z-50 space-y-1 animate-fadeIn">
                <button
                  onClick={() => handleSelectLang("en")}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    currentLang === "en" ? "bg-[#f53b70] text-white" : "text-[#cbb6bf] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>English</span>
                  <span className="text-[10px] opacity-70">EN</span>
                </button>
                <button
                  onClick={() => handleSelectLang("ru")}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    currentLang === "ru" ? "bg-[#f53b70] text-white" : "text-[#cbb6bf] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>Roman Urdu</span>
                  <span className="text-[10px] opacity-70">RU</span>
                </button>
                <button
                  onClick={() => handleSelectLang("ur")}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    currentLang === "ur" ? "bg-[#f53b70] text-white" : "text-[#cbb6bf] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>اردو (Urdu)</span>
                  <span className="text-[10px] opacity-70">UR</span>
                </button>
              </div>
            )}
          </div>

          {/* Option 3: Companion Intimate Alert Bell Trigger */}
          <button
            onClick={handleTriggerCompanionNotification}
            className={`relative size-8 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
              notifSent
                ? "bg-pink-500/20 border-[#f53b70] text-[#f53b70]"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-[#aeaeae] hover:text-white"
            }`}
            title="Companion Intimate Alerts / ساتھی الرٹ"
          >
            <Bell className="size-3.5" />
            <span className="absolute top-1 right-1 size-2 rounded-full bg-[#f53b70] animate-ping" />
          </button>

          {/* Get App PWA Button */}
          <button
            onClick={openPwaModal}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-white transition-all active:scale-95"
            title="Install Zovik AI as App"
          >
            <Smartphone className="size-3.5 text-[#f53b70]" />
            <span>{t.getApp}</span>
          </button>

          {/* User Auth: Login or Profile */}
          {(currentUser || isLocallyLoggedIn) ? (
            <div className="flex items-center space-x-2">
              {/* Real-Time Live Coins Badge */}
              <button
                onClick={openPremiumModal}
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-black transition-all active:scale-95 shadow-sm shadow-amber-500/10 group"
                title="Coin Store • 1 PKR = 1 Coin (Click to Recharge)"
              >
                <Coins className="size-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span>{walletBalance.toLocaleString()}</span>
                <span className="hidden sm:inline text-[10px] text-amber-400/80 font-normal">Coins</span>
                <span className="size-3.5 sm:size-4 rounded-full bg-amber-400 text-black text-[10px] sm:text-[11px] font-black flex items-center justify-center ml-0.5 shadow-sm">
                  +
                </span>
              </button>

              <button
                onClick={openProfileModal}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-[#1d1425] hover:bg-[#251930] border border-white/10 text-xs font-semibold text-white max-w-[170px] truncate transition-colors active:scale-95 shadow-sm group"
                title="View Account Profile"
              >
                <div className="relative size-6 rounded-lg overflow-hidden bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center shrink-0 border border-white/10">
                  {userData?.photoURL || currentUser?.photoURL ? (
                    <Image
                      src={userData?.photoURL || currentUser?.photoURL!}
                      alt="User Avatar"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="size-3.5 text-white" />
                  )}
                </div>
                <span className="truncate text-xs font-bold text-white">
                  {userData?.name || currentUser?.displayName || (currentUser?.email ? currentUser.email.split("@")[0] : "User")}
                </span>
                {currentTier === "vip" ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[9px] font-black uppercase tracking-wider flex items-center shrink-0 shadow-sm">
                    <Crown className="size-2.5 fill-black mr-0.5" />
                    VIP
                  </span>
                ) : currentTier === "plus" ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-pink-500 text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                    Plus
                  </span>
                ) : null}
              </button>
              <button
                onClick={onLogout}
                title="Log Out"
                className="size-8 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 flex items-center justify-center text-[#aeaeae] transition-colors"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center px-3 py-1.5 h-8">
              <div className="size-4 border-2 border-white/20 border-t-[#f53b70] rounded-full animate-spin"></div>
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white text-xs md:text-sm font-bold hover:brightness-110 shadow-md shadow-pink-600/20 active:scale-95 transition-all"
            >
              <LogIn className="size-4" />
              <span>{t.login}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Mobile Search Bar */}
      {isMobileSearchOpen && (
        <div className="relative flex md:hidden items-center mt-2.5 pt-2 border-t border-white/5 animate-fadeIn">
          <Search className="absolute left-3 size-4 text-[#aeaeae] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters by name, tag, or bio..."
            autoFocus
            className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#17101e] border border-white/10 text-xs text-white placeholder-[#888] focus:outline-none focus:border-[#f53b70]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-[#aeaeae] hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
