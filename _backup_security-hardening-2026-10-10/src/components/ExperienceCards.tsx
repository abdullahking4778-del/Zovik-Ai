"use client";

import React from "react";
import Image from "next/image";
import { Film, Disc3, Users, Sparkles } from "lucide-react";

interface ExperienceCardsProps {
  onOpenShorts: () => void;
  onOpenRoulette: () => void;
  onOpenCreate: () => void;
}

export default function ExperienceCards({
  onOpenShorts,
  onOpenRoulette,
  onOpenCreate,
}: ExperienceCardsProps) {
  const experiences = [
    {
      id: "shorts",
      title: "Zovik Shorts",
      subtitle: "Vertical AI Video Reels",
      badge: "HOT",
      icon: Film,
      bg: "from-[#2b0e24] via-[#1a0b1c] to-[#120816]",
      image: "/promos/zovik_shorts.jpg",
      objectFit: "object-cover object-top",
      action: onOpenShorts,
    },
    {
      id: "roulette",
      title: "Zovik Roulette",
      subtitle: "Spin to Match a Companion",
      badge: "LUCKY",
      icon: Disc3,
      bg: "from-[#1a1030] via-[#130b24] to-[#0e071a]",
      image: "/promos/zovik_roulette.jpg",
      objectFit: "object-contain object-bottom-right",
      action: onOpenRoulette,
    },
    {
      id: "creators",
      title: "Zovik Creators",
      subtitle: "Build Custom AI (VIP & Plus)",
      badge: "VIP EXCLUSIVE",
      icon: Users,
      bg: "from-[#29183d] via-[#1c0f2d] to-[#0f091c]",
      image: "/promos/zovik_creators.jpg",
      objectFit: "object-cover object-top",
      action: onOpenCreate,
    },
  ];

  return (
    <div className="my-6">
      <div className="flex items-center space-x-2 mb-3">
        <Sparkles className="size-4 text-[#f53b70]" />
        <h3 className="text-sm font-bold text-[#cbb6bf] uppercase tracking-wider">
          Featured Zovik Experiences
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {experiences.map((exp) => {
          const Icon = exp.icon;
          return (
            <div
              key={exp.id}
              onClick={exp.action}
              className={`group relative flex flex-col justify-between h-44 md:h-48 p-4 md:p-5 rounded-2xl bg-gradient-to-br ${exp.bg} border border-white/10 hover:border-[#f53b70]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-950/40 cursor-pointer overflow-hidden select-none`}
            >
              {/* Ultra-Realistic Background Art */}
              <div className="absolute right-0 bottom-0 top-0 w-36 md:w-44 opacity-85 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105 pointer-events-none">
                <Image
                  src={exp.image}
                  alt={exp.title}
                  fill
                  className={exp.objectFit}
                  unoptimized
                />
              </div>

              {/* Seamless Vignette & Gradient Overlays for perfect readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0d0a0f]/95 via-[#0d0a0f]/60 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a0f]/95 via-transparent to-transparent pointer-events-none" />

              {/* Top Row: Icon & Badge */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="size-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/15 group-hover:scale-110 group-hover:border-[#f53b70]/50 transition-all">
                  <Icon className="size-4 text-[#f53b70]" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f53b70] text-white text-[9px] font-black tracking-wider uppercase shadow-md shadow-pink-900/40">
                  {exp.badge}
                </span>
              </div>

              {/* Bottom Content */}
              <div className="relative z-10 mt-auto max-w-[65%]">
                <h4 className="text-base md:text-lg font-black text-white group-hover:text-[#f53b70] transition-colors leading-tight drop-shadow-sm">
                  {exp.title}
                </h4>
                <p className="text-[12px] text-[#cbb6bf] line-clamp-1 mt-1 font-medium">
                  {exp.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
