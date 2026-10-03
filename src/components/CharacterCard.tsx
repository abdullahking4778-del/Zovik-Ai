"use client";

import React from "react";
import Image from "next/image";
import { MessageCircle, Film, Sparkles, CheckCircle2, Phone, Heart, Crown, Lock } from "lucide-react";
import { Character } from "@/types";
import { getSafeImageUrl } from "@/lib/imageHelper";

interface CharacterCardProps {
  character: Character;
  onSelect: (character: Character) => void;
  onStartChat: (character: Character) => void;
  onStartCall: (character: Character) => void;
  isLiked?: boolean;
  onToggleLike?: (character: Character, e: React.MouseEvent) => void;
  isPaidUser?: boolean;
}

export default function CharacterCard({
  character,
  onSelect,
  onStartChat,
  onStartCall,
  isLiked = false,
  onToggleLike,
  isPaidUser = false,
}: CharacterCardProps) {
  const isVipChar = character.accessTier === "vip" || character.accessTier === "plus" || character.isVipOnly === true;
  const isLocked = isVipChar && !isPaidUser;

  return (
    <div
      className="group relative flex flex-col aspect-[3/5] w-full rounded-2xl md:rounded-[22px] overflow-hidden bg-[#120d16] border border-white/5 hover:border-[#f53b70]/40 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-900/20 hover:-translate-y-1.5 cursor-pointer select-none"
    >
      {/* Character Image */}
      <div className="absolute inset-0 size-full overflow-hidden" onClick={() => onSelect(character)}>
        <Image
          src={getSafeImageUrl(character.image)}
          alt={character.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
          unoptimized
          referrerPolicy="no-referrer"
        />
        {/* Shadow Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#08060a] via-[#08060a]/75 to-transparent" />
      </div>

      {/* Top Left Badge (e.g. VIP, NEW, HOT, ANIME) */}
      <div className="absolute top-2.5 left-2.5 z-20 flex items-center space-x-1">
        {isVipChar ? (
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black text-[10px] md:text-[11px] font-black tracking-wider uppercase shadow-md shadow-yellow-500/30">
            <Crown className="size-3 fill-black text-black" />
            <span>VIP</span>
          </div>
        ) : character.badge ? (
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#f53b70] to-[#ff2a6d] text-white text-[10px] md:text-[11px] font-black tracking-wider uppercase shadow-md shadow-pink-600/30">
            <Sparkles className="size-2.5" />
            <span>{character.badge}</span>
          </div>
        ) : null}
      </div>

      {/* Top Right Badges: In Series / Like button */}
      <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end space-y-1.5">
        {character.series && (
          <div className="size-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-sm" title="In Series / Shorts">
            <Film className="size-3.5 text-[#f53b70]" />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleLike) {
              onToggleLike(character, e);
            }
          }}
          title={isLiked ? "Remove from Collection" : "Save to Collection"}
          className={`size-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
            isLiked ? "text-[#f53b70] border-[#f53b70]/40" : "text-white/70 hover:text-white"
          }`}
        >
          <Heart className={`size-3.5 ${isLiked ? "fill-[#f53b70] text-[#f53b70]" : ""}`} />
        </button>
      </div>

      {/* Bottom Content Area */}
      <div className="relative z-20 mt-auto p-3.5 md:p-4 flex flex-col justify-end" onClick={() => onSelect(character)}>
        {/* Name, Age, Status */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1.5 min-w-0">
            <h3 className="text-base md:text-lg font-black text-white truncate group-hover:text-[#f53b70] transition-colors">
              {character.name}
            </h3>
            {character.verified && (
              <CheckCircle2 className="size-4 text-[#8b5cf6] shrink-0" />
            )}
            <span className="text-xs md:text-sm font-bold text-[#cbb6bf] shrink-0">
              {character.age}
            </span>
          </div>

          {/* Online status indicator */}
          <div className="flex items-center space-x-1 shrink-0 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-300 font-semibold">Online</span>
          </div>
        </div>

        {/* 2-Line Hook / Description */}
        <p className="text-[11px] md:text-xs text-[#aeaeae] line-clamp-2 leading-relaxed mb-3">
          {character.desc}
        </p>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartChat(character);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
              isLocked
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black shadow-amber-500/25 hover:brightness-110"
                : "bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white shadow-pink-600/20 hover:brightness-110"
            }`}
          >
            {isLocked ? <Lock className="size-3.5 text-black" /> : <MessageCircle className="size-3.5" />}
            <span>{isLocked ? "VIP Chat" : "Chat"}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartCall(character);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              isLocked
                ? "bg-[#23172e] border border-amber-500/30 text-amber-300 hover:bg-[#2d1e3a]"
                : "bg-[#23172e] border border-white/10 hover:bg-[#2d1e3a] text-white"
            }`}
          >
            {isLocked ? <Crown className="size-3.5 text-amber-400" /> : <Phone className="size-3.5 text-[#f53b70]" />}
            <span>{isLocked ? "VIP Call" : "Call"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
