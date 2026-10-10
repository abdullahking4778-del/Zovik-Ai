"use client";

import React from "react";
import { Flame, Sparkles, Star, HeartHandshake, Film, Compass } from "lucide-react";

interface FilterBarProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  characterCount: number;
}

export default function FilterBar({
  selectedCategory,
  setSelectedCategory,
  characterCount,
}: FilterBarProps) {
  const categories = [
    { id: "All", label: "All", icon: Compass },
    { id: "Trending", label: "Trending", icon: Flame },
    { id: "Hot", label: "Hot", icon: Sparkles },
    { id: "Popular", label: "Most Popular", icon: Star },
    { id: "Roleplay", label: "Deep Roleplay", icon: HeartHandshake },
    { id: "Anime", label: "Anime & Manga", icon: Film },
  ];

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 mb-6 overflow-x-auto no-scrollbar">
      {/* Category Pills */}
      <div className="flex items-center space-x-2 shrink-0">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-2xl text-xs md:text-sm font-bold transition-all ${
                isSelected
                  ? "bg-white text-black shadow-md shadow-white/10"
                  : "bg-[#17101e] text-[#aeaeae] hover:text-white hover:bg-white/5 border border-white/5"
              }`}
            >
              <Icon className={`size-3.5 ${isSelected ? "text-[#f53b70]" : "text-[#aeaeae]"}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Model Count Badge */}
      <div className="flex items-center text-xs font-semibold text-[#aeaeae] pl-3 shrink-0">
        <span>Showing <strong className="text-white">{characterCount}</strong> companions</span>
      </div>
    </div>
  );
}
