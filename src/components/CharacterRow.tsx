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
  onStartCall: (char: Character) => void;
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
  onStartCall,
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
    <section className="relative my-8">
      {/* Row Header with Title & Left/Right Arrows */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
            {title}
          </h3>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-[#f53b70]/20 border border-[#f53b70]/40 text-[#f53b70] text-[10px] font-black uppercase tracking-wider">
              {badge}
            </span>
          )}
          <span className="text-xs text-[#888] font-bold">
            ({characters.length})
          </span>
        </div>

        {/* Scroll Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={scrollLeft}
            className="size-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
            title="Scroll Left"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={scrollRight}
            className="size-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
            title="Scroll Right"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroller Container with Hover Navigation Arrows & Sleek Scrollbar */}
      <div className="relative group/scroller">
        {/* Floating Left Arrow (Desktop) */}
        <button
          onClick={scrollLeft}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-black/80 hover:bg-[#f53b70] border border-white/15 text-white items-center justify-center opacity-0 group-hover/scroller:opacity-100 transition-all shadow-xl hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm"
          title="Scroll Left"
        >
          <ChevronLeft className="size-5" />
        </button>

        {/* Floating Right Arrow (Desktop) */}
        <button
          onClick={scrollRight}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-black/80 hover:bg-[#f53b70] border border-white/15 text-white items-center justify-center opacity-0 group-hover/scroller:opacity-100 transition-all shadow-xl hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm"
          title="Scroll Right"
        >
          <ChevronRight className="size-5" />
        </button>

        <div
          ref={scrollerRef}
          className="flex items-stretch space-x-4 overflow-x-auto scrollbar-thin pb-3 scroll-smooth snap-x snap-mandatory"
        >
          {characters.map((char) => (
            <div
              key={char.id}
              className="w-56 sm:w-64 md:w-72 shrink-0 snap-start"
            >
              <CharacterCard
                character={char}
                onSelect={onSelect}
                onStartChat={onStartChat}
                onStartCall={onStartCall}
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
