"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Smartphone, LogIn, LogOut, User, X, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);

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
            <span className="hidden sm:inline">Girls</span>
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
            <span className="hidden sm:inline">Boys</span>
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
            <span className="hidden sm:inline">Anime</span>
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
          <div className="relative hidden md:flex items-center w-48 lg:w-64">
            <Search className="absolute left-3 size-4 text-[#aeaeae] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search characters..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#17101e] border border-white/10 text-xs md:text-sm text-white placeholder-[#888] focus:outline-none focus:border-[#f53b70] transition-colors"
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

          {/* Get App PWA Button */}
          <button
            onClick={openPwaModal}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-white transition-all active:scale-95"
            title="Install Zovik AI as App"
          >
            <Smartphone className="size-3.5 text-[#f53b70]" />
            <span>Get App</span>
          </button>

          {/* User Auth: Login or Profile */}
          {(currentUser || isLocallyLoggedIn) ? (
            <div className="flex items-center space-x-2">
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
              <span>Log In</span>
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
