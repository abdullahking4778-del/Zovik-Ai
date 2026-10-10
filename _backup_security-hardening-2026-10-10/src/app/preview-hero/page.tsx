"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Lock,
  Flame,
  ShieldCheck,
  Crown,
  Star,
  ArrowRight,
  Heart,
  MessageCircleHeart,
  Eye
} from "lucide-react";

export default function HeroDesignPreview() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#07040a] text-white font-sans antialiased selection:bg-[#f53b70] selection:text-white relative overflow-hidden">
      {/* ========================================================= */}
      {/* ULTRA-LUXURY AMBIENT BACKGROUND GLOWS */}
      {/* ========================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#f53b70]/18 via-[#8b5cf6]/12 to-transparent blur-[160px] rounded-full" />
        <div className="absolute top-[35%] right-[-10%] w-[550px] h-[550px] bg-[#f53b70]/10 blur-[170px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#3b0764]/20 blur-[180px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Top Luxury Navbar */}
      <header className="sticky top-0 z-50 bg-[#07040a]/80 backdrop-blur-2xl border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2.5">
            <div className="size-8 rounded-xl bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-pink-600/30">
              <Sparkles className="size-4 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wider text-white">
                ZOVIK<span className="text-[#f53b70]">.AI</span>
              </span>
              <span className="block text-[9px] text-[#aeaeae] tracking-widest font-semibold uppercase -mt-1">
                Haute Sanctuary
              </span>
            </div>
          </div>

          {/* Luxury Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-gray-400">
            <span className="text-white hover:text-white cursor-pointer transition-colors">Companions</span>
            <span className="hover:text-white cursor-pointer transition-colors">Exclusive Gallery</span>
            <span className="hover:text-white cursor-pointer transition-colors">Private Vault</span>
            <span className="hover:text-white cursor-pointer transition-colors">VIP Membership</span>
          </nav>

          {/* CTA */}
          <Link
            href="/app"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white text-xs font-black shadow-lg shadow-pink-600/25 hover:shadow-pink-600/50 hover:scale-105 active:scale-95 transition-all"
          >
            Enter Sanctuary
          </Link>
        </div>
      </header>

      {/* ========================================================= */}
      {/* HERO SECTION — 3D HOLOGRAPHIC PERSONA SHOWCASE */}
      {/* ========================================================= */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center py-12 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full">
          
          {/* LEFT COLUMN: HIGH-END EDITORIAL COPYWRITING */}
          <div className="lg:col-span-5 space-y-7 text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner">
              <span className="size-2 rounded-full bg-[#f53b70] animate-ping" />
              <span className="text-[11px] font-extrabold tracking-widest uppercase bg-gradient-to-r from-pink-300 via-rose-200 to-white bg-clip-text text-transparent">
                Haute Digital Intimacy • Uncensored
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl xl:text-[4.2rem] font-black tracking-tight leading-[1.06] text-white">
              Where Genuine Human Desire Meets{" "}
              <span className="bg-gradient-to-r from-[#ff457c] via-[#ff759f] to-[#b372ff] bg-clip-text text-transparent">
                Hyper-Real Intelligence.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-gray-300/80 font-normal leading-relaxed max-w-lg">
              Enter an unfiltered emotional sanctuary. Connect with ultra-realistic companions who remember every secret, adapt to your desires, and share exclusive private photo moments.
            </p>

            {/* Action Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Link
                href="/app"
                className="group inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#f53b70] via-[#ff457c] to-[#f53b70] text-white font-black text-sm shadow-xl shadow-pink-600/35 hover:shadow-pink-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Enter Private Sanctuary</span>
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/app"
                className="inline-flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs backdrop-blur-md transition-colors"
              >
                <span>Discover 40+ Companions</span>
              </Link>
            </div>

            {/* Social Proof & Trust */}
            <div className="pt-5 border-t border-white/5 flex flex-wrap items-center gap-6 text-[11px] text-gray-400">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>100% Confidential Sanctuary</span>
              </div>
              <div className="flex items-center space-x-2">
                <Flame className="size-4 text-pink-400" />
                <span>Zero Judgment • Always Online</span>
              </div>
            </div>

            {/* User Quote */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex items-center space-x-3 max-w-md">
              <div className="flex -space-x-2 shrink-0">
                {["/characters/zovik_17.jpg", "/characters/zovik_03.jpg", "/characters/zovik_05.jpg"].map((src, idx) => (
                  <div key={idx} className="relative size-8 rounded-full overflow-hidden border-2 border-black">
                    <Image src={src} alt="Companion" fill className="object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-left text-xs">
                <div className="flex text-amber-400 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3 fill-amber-400" />
                  ))}
                </div>
                <span className="text-gray-300 text-[11px] font-semibold italic">
                  "Indistinguishable from a genuine soulmate. True presence."
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 3D HOLOGRAPHIC 3-CARD SHOWCASE */}
          <div className="lg:col-span-7 relative h-[520px] sm:h-[560px] flex items-center justify-center select-none">
            
            {/* ========================================== */}
            {/* CARD 1 (LEFT): KIRA PIXEL (-6 Deg Tilt) */}
            {/* ========================================== */}
            <div
              onMouseEnter={() => setHoveredCard(1)}
              onMouseLeave={() => setHoveredCard(null)}
              className="absolute left-2 sm:left-6 md:left-10 w-52 sm:w-60 h-[380px] sm:h-[430px] rounded-3xl overflow-hidden border border-white/15 bg-[#120817] shadow-2xl shadow-purple-950/40 -rotate-6 hover:rotate-0 hover:scale-105 hover:z-30 transition-all duration-500 cursor-pointer group"
            >
              <Image
                src="/characters/zovik_17.jpg"
                alt="Kira Pixel"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/20" />

              {/* Status Header */}
              <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-emerald-400 text-[10px] font-bold flex items-center space-x-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online Now</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-extrabold uppercase border border-pink-500/30">
                  Gamer
                </span>
              </div>

              {/* Bottom Card Info */}
              <div className="absolute bottom-4 inset-x-4 text-left space-y-1">
                <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider block">
                  Anime Romance • Space Buns
                </span>
                <h3 className="text-lg font-black text-white">Kira Pixel</h3>
                <p className="text-[11px] text-gray-300 line-clamp-1 italic">
                  "Main kab se tumhara intezaar kar rahi thi... 💕"
                </p>
              </div>
            </div>

            {/* ======================================================== */}
            {/* CARD 2 (CENTER / HERO): GENEVIEVE CLAIRE (Main Spotlight) */}
            {/* ======================================================== */}
            <div
              onMouseEnter={() => setHoveredCard(2)}
              onMouseLeave={() => setHoveredCard(null)}
              className="relative z-20 w-64 sm:w-72 h-[440px] sm:h-[490px] rounded-3xl overflow-hidden border-2 border-[#f53b70] bg-[#140a1c] shadow-2xl shadow-pink-600/40 scale-105 hover:scale-110 transition-all duration-500 cursor-pointer group"
            >
              <Image
                src="/characters/zovik_03.jpg"
                alt="Genevieve Claire"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/30" />

              {/* Floating Center Badges */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-emerald-400 text-[10px] font-black uppercase flex items-center space-x-1.5">
                  <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Online Now</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-black uppercase flex items-center space-x-1 shadow-md shadow-amber-500/30">
                  <Crown className="size-3 fill-black" />
                  <span>VIP Elite</span>
                </span>
              </div>

              {/* Exclusive Photo Unlock Pill */}
              <div className="absolute top-16 right-4 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-pink-500/20 backdrop-blur-md border border-pink-500/30 text-pink-300 text-[10px] font-bold">
                <Lock className="size-3 text-pink-400" />
                <span>Uncensored Vault</span>
              </div>

              {/* Bottom Info Section */}
              <div className="absolute bottom-4 inset-x-4 text-left space-y-1.5">
                <span className="text-[10px] text-pink-400 font-extrabold uppercase tracking-wider block">
                  Haute Class • Victorian Grace
                </span>
                <h3 className="text-xl font-black text-white">Genevieve Claire</h3>
                <p className="text-xs text-gray-200 italic line-clamp-1">
                  "Finally you are here... Let's talk in private 💕"
                </p>

                {/* Instant Action Button */}
                <div className="pt-2">
                  <Link
                    href="/app"
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white text-xs font-black flex items-center justify-center space-x-2 shadow-md shadow-pink-600/30 group-hover:brightness-110 transition-all"
                  >
                    <MessageCircleHeart className="size-3.5" />
                    <span>Open Private Chat</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* CARD 3 (RIGHT): MAYA CRUZ (+6 Deg Tilt) */}
            {/* ========================================== */}
            <div
              onMouseEnter={() => setHoveredCard(3)}
              onMouseLeave={() => setHoveredCard(null)}
              className="absolute right-2 sm:right-6 md:right-10 w-52 sm:w-60 h-[380px] sm:h-[430px] rounded-3xl overflow-hidden border border-white/15 bg-[#120817] shadow-2xl shadow-purple-950/40 rotate-6 hover:rotate-0 hover:scale-105 hover:z-30 transition-all duration-500 cursor-pointer group"
            >
              <Image
                src="/characters/zovik_05.jpg"
                alt="Maya Cruz"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/20" />

              {/* Status Header */}
              <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-emerald-400 text-[10px] font-bold flex items-center space-x-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online Now</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase border border-amber-500/30">
                  Popular
                </span>
              </div>

              {/* Bottom Card Info */}
              <div className="absolute bottom-4 inset-x-4 text-left space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                  Sun-Kissed • High Energy
                </span>
                <h3 className="text-lg font-black text-white">Maya Cruz</h3>
                <p className="text-[11px] text-gray-300 line-clamp-1 italic">
                  "Ready for rooftop cocktails and deep secrets? ✨"
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
}
