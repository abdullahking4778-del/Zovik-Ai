"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import CharacterCard from "@/components/CharacterCard";
import { Character } from "@/types";

interface CharacterRowProps {
  title: string;
  badge?: string;
  characters: Character[];
  onSelect: (char: Character) => void;
  onStartChat: (char: Character) => void;
  likedIds?: string[];
  onToggleLike?: (char: Character, e: React.MouseEvent) => void;
  isPaidUser?: boolean;
}

export default function CharacterRow({
  title,
  badge,
  characters,
  onSelect,
  onStartChat,
  likedIds = [],
  onToggleLike,
  isPaidUser = false,
}: CharacterRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    scrollerRef.current?.scrollBy({ left: -420, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollerRef.current?.scrollBy({ left: 420, behavior: "smooth" });
  };

  if (characters.length === 0) return null;

  return (
    <section className="relative my-5 sm:my-8">
      {/* Row Header with Title & Left/Right Arrows */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
          <h3 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight truncate">
            {title}
          </h3>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-[#f53b70]/20 border border-[#f53b70]/40 text-[#f53b70] text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0">
              {badge}
            </span>
          )}
          <span className="text-xs text-[#888] font-bold shrink-0">
            ({characters.length})
          </span>
        </div>

        {/* Scroll Buttons */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={scrollLeft}
            className="size-7 sm:size-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
            title="Scroll Left"
          >
            <ChevronLeft className="size-3.5 sm:size-4" />
          </button>
          <button
            onClick={scrollRight}
            className="size-7 sm:size-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
            title="Scroll Right"
          >
            <ChevronRight className="size-3.5 sm:size-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroller Container with Sleek Scrollbar */}
      <div className="relative group/scroller">
        <div
          ref={scrollerRef}
          className="flex items-stretch space-x-3 sm:space-x-4 overflow-x-auto scrollbar-thin pb-3 scroll-smooth snap-x snap-mandatory touch-pan-x"
        >
          {characters.map((char) => (
            <div
              key={char.id}
              className="w-48 sm:w-60 md:w-72 2xl:w-80 shrink-0 snap-start"
            >
              <CharacterCard
                character={char}
                onSelect={onSelect}
                onStartChat={onStartChat}
                isLiked={likedIds.includes(char.id)}
                onToggleLike={onToggleLike}
                isPaidUser={isPaidUser}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
