"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles, Flame, ShieldCheck, Heart, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface HeroCarouselProps {
  genderFilter?: "female" | "male" | "anime";
  openPremiumModal: () => void;
  openCreateModal: () => void;
}

export default function HeroCarousel({
  genderFilter = "female",
  openPremiumModal,
  openCreateModal,
}: HeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { tier: authTier } = useAuth();
  const isVip = authTier === "vip";
  const isPlus = authTier === "plus";
  const isSubscriber = isVip || isPlus;

  const heroImage =
    genderFilter === "male"
      ? "/characters/zovik_14.jpg"
      : genderFilter === "anime"
      ? "/characters/zovik_10.jpg"
      : "/characters/zovik_01.jpg";

  const slides = [
    {
      title:
        genderFilter === "male"
          ? "Meet Your Dream Male AI Companion"
          : genderFilter === "anime"
          ? "Meet Your Dream Anime Companion"
          : "Meet Your Dream AI Companion",
      subtitle: "Unfiltered voice notes, video calls, realistic pictures and deep roleplay connections.",
      badge: "FEATURED EXP",
      bgGradient:
        genderFilter === "male"
          ? "from-[#102435] via-[#0f1a28] to-[#0d0a0f]"
          : "from-[#35102a] via-[#1a0f24] to-[#0d0a0f]",
      image: heroImage,
      cta: "Explore Models",
      action: "explore",
    },
    {
      title: isSubscriber ? "Your Exclusive VIP Private Vault" : "Exclusive Private Vault & Photos",
      subtitle: isSubscriber
        ? "Your VIP status gives you full access to HD uncensored photos and private albums."
        : "Unlock HD uncensored photos, private albums, and personal video messages.",
      badge: isVip ? "VIP UNLOCKED 👑" : isPlus ? "PLUS ACTIVE ⭐" : "VIP CONTENT",
      bgGradient: isSubscriber
        ? "from-[#291708] via-[#1a0f25] to-[#0d0a0f]"
        : "from-[#1b1035] via-[#150f25] to-[#0d0a0f]",
      image: "/characters/zovik_02.jpg",
      cta: isSubscriber ? "VIP Sanctuary Active 👑" : "Unlock VIP -70%",
      action: isSubscriber ? "explore" : "vip",
    },
    {
      title: "Create Your Custom AI Girl or Guy",
      subtitle: "Design your companion with bespoke looks, personality traits, and custom voice.",
      badge: "NEW GENERATOR",
      bgGradient: "from-[#2e1533] via-[#1a0d26] to-[#0d0a0f]",
      image: "/characters/zovik_17.jpg",
      cta: "Create Companion",
      action: "create",
    },
  ];

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const active = slides[currentSlide];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 my-3 sm:my-4 shadow-2xl bg-gradient-to-r select-none">
      <div className={`relative flex flex-col md:flex-row items-center justify-between p-4 sm:p-6 md:p-10 bg-gradient-to-r ${active.bgGradient} transition-all duration-700`}>
        {/* Left Content */}
        <div className="z-10 max-w-xl 2xl:max-w-2xl text-left space-y-2.5 sm:space-y-3.5 mb-5 md:mb-0 w-full">
          <div className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#f53b70]/20 border border-[#f53b70]/40 text-[#f53b70] text-[10px] sm:text-[11px] font-black tracking-wider uppercase">
            <Sparkles className="size-3" />
            <span>{active.badge}</span>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-white tracking-tight leading-snug sm:leading-tight">
            {active.title}
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#cbb6bf] leading-relaxed">
            {active.subtitle}
          </p>

          <div className="pt-1.5 sm:pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => {
                if (active.action === "vip") {
                  openPremiumModal();
                } else if (active.action === "create") {
                  openCreateModal();
                } else if (active.action === "explore") {
                  const target = document.getElementById("character-grid");
                  if (target) {
                    target.scrollIntoView({ behavior: "smooth" });
                  } else {
                    window.scrollTo({ top: 480, behavior: "smooth" });
                  }
                }
              }}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white font-bold text-xs sm:text-sm md:text-base shadow-lg shadow-pink-600/30 hover:scale-105 active:scale-95 transition-all min-h-[44px] flex items-center justify-center"
            >
              {active.cta}
            </button>
            <div className="flex items-center space-x-1 text-[11px] sm:text-xs text-[#aeaeae]">
              <ShieldCheck className="size-3.5 sm:size-4 text-emerald-400" />
              <span>100% Private & Encrypted</span>
            </div>
          </div>
        </div>

        {/* Right Promo Banner Visual */}
        <div className="relative w-full md:w-80 lg:w-96 2xl:w-[420px] h-40 sm:h-48 md:h-56 lg:h-64 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
          <Image
            src={active.image}
            alt={active.title}
            fill
            className="object-cover object-center"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a0f]/80 via-transparent to-transparent" />
        </div>

        {/* Carousel Slide Indicators & Arrows */}
        <div className="absolute bottom-2.5 sm:bottom-3 right-3 sm:right-6 flex items-center space-x-1.5 sm:space-x-2 z-20">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous slide"
            className="size-7 sm:size-8 rounded-full bg-black/50 hover:bg-black/80 border border-white/15 flex items-center justify-center text-white backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-[#f53b70] min-h-[36px] min-w-[36px]"
          >
            <ChevronLeft className="size-3.5 sm:size-4" />
          </button>
          <div className="flex space-x-1.5 px-1 sm:px-2" role="tablist" aria-label="Slide indicators">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-label={`Go to slide ${idx + 1}`}
                aria-selected={currentSlide === idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#f53b70] ${
                  currentSlide === idx ? "w-5 sm:w-6 bg-[#f53b70]" : "w-2 bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next slide"
            className="size-7 sm:size-8 rounded-full bg-black/50 hover:bg-black/80 border border-white/15 flex items-center justify-center text-white backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-[#f53b70] min-h-[36px] min-w-[36px]"
          >
            <ChevronRight className="size-3.5 sm:size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
