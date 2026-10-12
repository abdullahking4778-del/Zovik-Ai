"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, MessageCircle, CheckCircle2, Heart, Share2, Trash2, Crown, Lock, Images } from "lucide-react";
import { Character } from "@/types";
import { getCurrentLanguage, getT, LanguageCode } from "@/lib/translations";
import { normalizeTags } from "@/lib/tagHelper";
import { getSafeImageUrl } from "@/lib/imageHelper";

interface CharacterModalProps {
  character: Character | null;
  onClose: () => void;
  onStartChat: (character: Character) => void;
  onDelete?: (charId: string, charName: string) => void;
  isLiked?: boolean;
  onToggleLike?: (character: Character) => void;
  isPaidUser?: boolean;
  openPremiumModal?: () => void;
}

export default function CharacterModal({
  character,
  onClose,
  onStartChat,
  onDelete,
  isLiked = false,
  onToggleLike,
  isPaidUser = false,
  openPremiumModal,
}: CharacterModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [lang, setLang] = useState<LanguageCode>("en");

  useEffect(() => {
    setLang(getCurrentLanguage());
    const handleLang = (e: Event) => {
      const ce = e as CustomEvent<LanguageCode>;
      if (ce.detail) setLang(ce.detail);
    };
    window.addEventListener("zovik_lang_changed", handleLang);
    return () => window.removeEventListener("zovik_lang_changed", handleLang);
  }, []);

  if (!character) return null;

  const t = getT(lang);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVipChar = character.accessTier === "vip" || character.accessTier === "plus" || character.isVipOnly === true;
  const currentPhoto = getSafeImageUrl(selectedPhoto || character.image || "/characters/zovik_01.jpg");
  const safeTags = normalizeTags(character.tags);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[min(92dvh,800px)] overflow-y-auto md:overflow-hidden rounded-3xl bg-[#120d16] border border-white/10 shadow-2xl shadow-pink-950/30 scrollbar-thin overscroll-contain">
        {/* Top Right Action Buttons: Heart/Save and Close */}
        <div className="absolute top-4 right-4 z-30 flex items-center space-x-2">
          {onToggleLike && (
            <button
              onClick={() => onToggleLike(character)}
              title={isLiked ? "Remove from Collection" : "Save to Collection"}
              className={`size-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 flex items-center justify-center transition-all active:scale-90 ${
                isLiked ? "text-[#f53b70] border-[#f53b70]/40" : "text-white/70 hover:text-white"
              }`}
            >
              <Heart className={`size-4 ${isLiked ? "fill-[#f53b70] text-[#f53b70]" : ""}`} />
            </button>
          )}
          <button
            onClick={onClose}
            className="size-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Left Side: High-Res Companion Portrait (Zero Video Tag = Zero IDM Interception) */}
        <div className="relative w-full md:w-1/2 h-80 md:h-auto min-h-[400px] shrink-0 overflow-hidden bg-[#0d0711]">
          <Image
            src={currentPhoto}
            alt={character.name}
            fill
            className="object-cover object-top transition-all duration-300"
            unoptimized
            priority
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120d16] via-transparent to-transparent md:hidden" />

          {/* Photo Gallery Selector Pill if multiple photos exist */}
          {character.gallery && character.gallery.length > 1 && (
            <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-center space-x-2 p-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center space-x-1">
                <Images className="size-3 text-[#f53b70]" />
                <span>{t.album}:</span>
              </span>
              {character.gallery.map((photoUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPhoto(photoUrl)}
                  className={`relative size-8 rounded-lg overflow-hidden shrink-0 border transition-all ${
                    (selectedPhoto || character.image) === photoUrl ? "border-[#f53b70] scale-105 ring-2 ring-[#f53b70]/50" : "border-white/20 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={getSafeImageUrl(photoUrl)}
                    alt={`Photo ${idx + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Details, Backstory, Traits & Clean Full-Width CTA */}
        <div className="flex flex-col justify-between w-full md:w-1/2 p-6 md:p-8 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                {isVipChar ? (
                  <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-black uppercase tracking-wider shadow-md shadow-yellow-500/30">
                    <Crown className="size-3.5 fill-black text-black" />
                    <span>{t.vipOnly}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#f53b70]/20 text-[#f53b70] text-xs font-black uppercase tracking-wider border border-[#f53b70]/30">
                    {character.category}
                  </span>
                )}
                {character.verified && (
                  <span className="flex items-center space-x-1 text-xs text-[#8b5cf6] font-bold">
                    <CheckCircle2 className="size-3.5" />
                    <span>Official Model</span>
                  </span>
                )}
              </div>

              <div className="flex items-baseline space-x-3">
                <h2 className="text-2xl md:text-3xl font-black text-white">{character.name}</h2>
                <span className="text-xl font-bold text-[#cbb6bf]">{character.age}</span>
              </div>
              <p className="text-sm font-semibold text-[#f53b70] mt-0.5">{character.tagline}</p>
            </div>

            {/* Backstory & Personality */}
            <div>
              <h4 className="text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-2">{t.backstory}</h4>
              <p className="text-sm text-[#e0d6dc] leading-relaxed bg-[#1b1322] p-4 rounded-2xl border border-white/5">
                {character.desc}
              </p>
            </div>

            {/* Personality Tags */}
            <div>
              <h4 className="text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-2">{t.traits}</h4>
              <div className="flex flex-wrap gap-1.5">
                {safeTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/90"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action CTAs: Full-width Chat Now button */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <button
              onClick={() => {
                onClose();
                onStartChat(character);
              }}
              className="flex items-center justify-center space-x-2.5 w-full py-3.5 rounded-2xl font-black text-base shadow-xl active:scale-95 transition-all bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white shadow-pink-600/30 hover:brightness-110"
            >
              <MessageCircle className="size-5" />
              <span>{t.chatNow}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center space-x-1.5 w-full py-2 text-xs font-semibold text-[#aeaeae] hover:text-white transition-colors"
            >
              <Share2 className="size-3.5" />
              <span>{copied ? t.linkCopied : t.shareChar}</span>
            </button>

            {/* If custom character, allow deleting */}
            {(character.id.startsWith("char_custom_") || character.id.startsWith("custom-") || character.badge === "MY AI" || character.category === "Custom" || Boolean(character.creatorId) || Boolean(character.creatorEmail)) && onDelete && (
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && !window.confirm(`Kya aap "${character.name}" ko permanently delete karna chahte hain?`)) return;
                  onDelete(character.id, character.name);
                  onClose();
                }}
                className="flex items-center justify-center space-x-1.5 w-full py-2.5 rounded-xl bg-red-500/15 hover:bg-red-600/30 border border-red-500/30 text-xs font-black text-red-400 hover:text-red-200 transition-all active:scale-95 shadow-md shadow-red-950/20"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Companion 🗑️</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
