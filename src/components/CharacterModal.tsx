"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, MessageCircle, Phone, Volume2, VolumeX, CheckCircle2, Sparkles, Heart, Share2, Trash2 } from "lucide-react";
import { Character } from "@/types";

interface CharacterModalProps {
  character: Character | null;
  onClose: () => void;
  onStartChat: (character: Character) => void;
  onStartCall: (character: Character) => void;
  onDelete?: (charId: string, charName: string) => void;
  isLiked?: boolean;
  onToggleLike?: (character: Character) => void;
}

export default function CharacterModal({
  character,
  onClose,
  onStartChat,
  onStartCall,
  onDelete,
  isLiked = false,
  onToggleLike,
}: CharacterModalProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!character) return null;

  const toggleAudio = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlayingAudio(true);

    const sampleText = character.greeting || `Hey there, I am ${character.name}! So excited to chat with you 💕`;
    const clean = sampleText.replace(/[^\p{L}\p{N}\s.,?!'’\-]/gu, "").trim();
    const utterance = new SpeechSynthesisUtterance(clean);

    const isUrduScript = /[\u0600-\u06FF]/.test(clean);
    utterance.lang = isUrduScript ? "ur-PK" : "en-US";

    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const isFemale = character.gender !== "male";

      if (isUrduScript) {
        const urduVoice = voices.find((v) => v.lang.startsWith("ur") || v.lang.startsWith("hi"));
        if (urduVoice) {
          utterance.voice = urduVoice;
          return;
        }
      }

      if (isFemale) {
        const femaleVoice = voices.find(
          (v) =>
            v.name.includes("Zira") ||
            v.name.includes("Female") ||
            v.name.includes("Jenny") ||
            v.name.includes("Samantha") ||
            v.name.includes("Victoria") ||
            v.name.includes("Google UK English Female") ||
            (v.name.includes("English") && !v.name.includes("David") && !v.name.includes("Male"))
        );
        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.pitch = 1.25;
      } else {
        const maleVoice = voices.find((v) => v.name.includes("David") || v.name.includes("Male"));
        if (maleVoice) utterance.voice = maleVoice;
        utterance.pitch = 0.95;
      }
    };

    selectVoice();
    utterance.rate = 0.96;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    onClose();
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[92vh] overflow-y-auto md:overflow-hidden rounded-3xl bg-[#120d16] border border-white/10 shadow-2xl shadow-pink-950/30">
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
            onClick={handleClose}
            className="size-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Left Side: High-Res Portrait & Media */}
        <div className="relative w-full md:w-1/2 h-80 md:h-auto min-h-[380px] shrink-0 overflow-hidden bg-black">
          <Image
            src={character.image}
            alt={character.name}
            fill
            className="object-cover object-top"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120d16] via-transparent to-transparent md:hidden" />

          {/* Voice Note Player Pill */}
          <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-between p-3 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/10">
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleAudio}
                className="size-10 rounded-full bg-[#f53b70] hover:brightness-110 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 transition-transform active:scale-95"
              >
                {isPlayingAudio ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
              <div>
                <span className="block text-xs font-bold text-white">Voice Sample</span>
                <span className="block text-[10px] text-[#aeaeae]">{character.voice}</span>
              </div>
            </div>

            {/* Animated Soundwave */}
            <div className="flex items-center space-x-1 px-3">
              {[4, 12, 8, 16, 22, 14, 18, 10, 6].map((h, i) => (
                <span
                  key={i}
                  style={{
                    height: isPlayingAudio ? `${h}px` : "4px",
                    transition: "height 0.2s ease",
                  }}
                  className={`w-1 rounded-full ${
                    isPlayingAudio ? "bg-[#f53b70]" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Details, Backstory, Tags & CTAs */}
        <div className="flex flex-col justify-between w-full md:w-1/2 p-6 md:p-8 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-[#f53b70]/20 text-[#f53b70] text-xs font-black uppercase tracking-wider border border-[#f53b70]/30">
                  {character.category}
                </span>
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
              <h4 className="text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-2">Backstory</h4>
              <p className="text-sm text-[#e0d6dc] leading-relaxed bg-[#1b1322] p-4 rounded-2xl border border-white/5">
                {character.desc}
              </p>
            </div>

            {/* Personality Tags */}
            <div>
              <h4 className="text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-2">Traits & Persona</h4>
              <div className="flex flex-wrap gap-1.5">
                {character.tags.map((tag) => (
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

          {/* Action CTAs */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  handleClose();
                  onStartChat(character);
                }}
                className="flex items-center justify-center space-x-2 py-3 rounded-2xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white font-bold text-sm md:text-base shadow-xl shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all"
              >
                <MessageCircle className="size-5" />
                <span>Chat Now</span>
              </button>

              <button
                onClick={() => {
                  handleClose();
                  onStartCall(character);
                }}
                className="flex items-center justify-center space-x-2 py-3 rounded-2xl bg-[#23172e] border border-white/10 hover:bg-[#2d1e3a] text-white font-bold text-sm md:text-base active:scale-95 transition-all"
              >
                <Phone className="size-5 text-[#f53b70]" />
                <span>Audio Call</span>
              </button>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center justify-center space-x-1.5 w-full py-2 text-xs font-semibold text-[#aeaeae] hover:text-white transition-colors"
            >
              <Share2 className="size-3.5" />
              <span>{copied ? "Link Copied!" : "Share Character"}</span>
            </button>

            {/* If custom character, allow deleting */}
            {(character.id.startsWith("custom-") || character.badge === "MY AI") && onDelete && (
              <button
                onClick={() => {
                  onDelete(character.id, character.name);
                  onClose();
                }}
                className="flex items-center justify-center space-x-1.5 w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Custom Companion</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
