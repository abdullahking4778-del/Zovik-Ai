"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Disc3, Sparkles, MessageCircle, RotateCcw } from "lucide-react";
import { Character } from "@/types";

interface RouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  onSelectCharacter: (char: Character) => void;
}

export default function RouletteModal({
  isOpen,
  onClose,
  characters,
  onSelectCharacter,
}: RouletteModalProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedCompanion, setSelectedCompanion] = useState<Character | null>(null);

  if (!isOpen) return null;

  const displayChars = characters.slice(0, 8);

  const handleSpin = () => {
    if (spinning || displayChars.length === 0) return;

    setSpinning(true);
    setSelectedCompanion(null);

    // Pick random character from the active wheel characters
    const randomIndex = Math.floor(Math.random() * displayChars.length);
    const chosen = displayChars[randomIndex];

    // Compute exact angle so the pointer pin at top lands on the chosen character
    const N = displayChars.length;
    const segmentDegree = 360 / N;
    const extraSpins = 360 * 6; // 6 full smooth spins
    const currentNorm = rotation % 360;
    const targetOffset = (360 - randomIndex * segmentDegree) % 360;
    const diff = (targetOffset - currentNorm + 360) % 360;
    const targetDegree = rotation + extraSpins + diff;

    setRotation(targetDegree);

    setTimeout(() => {
      setSpinning(false);
      setSelectedCompanion(chosen);
    }, 3200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative flex flex-col items-center justify-between w-full max-w-lg bg-gradient-to-b from-[#1c1026] via-[#120a1a] to-[#0a050e] rounded-3xl border border-[#f53b70]/40 shadow-2xl p-6 md:p-8 text-center overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#f53b70]/20 border border-[#f53b70]/40 text-[#f53b70] text-xs font-black tracking-widest uppercase mb-2">
            <Disc3 className="size-3.5 animate-spin" />
            <span>ZOVIK AI ROULETTE</span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white">
            Spin to Match Your Companion
          </h3>
          <p className="text-xs text-[#aeaeae]">
            Let fate decide which AI companion matches your current vibe tonight!
          </p>
        </div>

        {/* Wheel Display or Match Found Card */}
        {selectedCompanion ? (
          <div className="flex flex-col items-center my-4 animate-scaleUp">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase mb-3">
              <Sparkles className="size-3.5" />
              <span>It&apos;s a Match!</span>
            </div>

            <div className="relative size-36 rounded-full overflow-hidden border-4 border-[#f53b70] shadow-2xl shadow-pink-600/40 mb-3">
              <Image
                src={selectedCompanion.image}
                alt={selectedCompanion.name}
                fill
                className="object-cover object-top"
                unoptimized
              />
            </div>

            <h4 className="text-2xl font-black text-white">{selectedCompanion.name}, {selectedCompanion.age}</h4>
            <p className="text-xs text-[#f53b70] font-semibold mb-1">{selectedCompanion.tagline}</p>
            <p className="text-xs text-[#cbb6bf] max-w-xs line-clamp-2 mb-4">{selectedCompanion.desc}</p>

            <div className="flex items-center space-x-3 w-full">
              <button
                onClick={handleSpin}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
              >
                <RotateCcw className="size-3.5" />
                <span>Spin Again</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onSelectCharacter(selectedCompanion);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center justify-center space-x-1.5 hover:scale-105 active:scale-95 transition-all"
              >
                <MessageCircle className="size-3.5" />
                <span>Chat Now</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex items-center justify-center my-6">
            {/* Pointer Pin */}
            <div className="absolute -top-3 z-30 size-6 text-[#f53b70] drop-shadow-[0_2px_8px_rgba(245,59,112,0.8)]">
              ▼
            </div>

            {/* Glowing Wheel Container */}
            <div
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 3.2s cubic-bezier(0.15, 0.9, 0.25, 1)" : "none",
              }}
              className="relative size-60 rounded-full border-4 border-[#f53b70]/60 bg-[#150d1e] shadow-2xl shadow-pink-900/40 overflow-hidden flex items-center justify-center"
            >
              {displayChars.map((char, idx) => {
                const angle = (idx * 360) / displayChars.length;
                return (
                  <div
                    key={char.id}
                    style={{
                      transform: `rotate(${angle}deg) translateY(-85px)`,
                    }}
                    className="absolute flex flex-col items-center"
                  >
                    <div className="relative size-9 rounded-full overflow-hidden border border-white/20 shadow-sm">
                      <Image
                        src={char.image}
                        alt={char.name}
                        fill
                        className="object-cover object-top"
                        unoptimized
                      />
                    </div>
                    <span className="text-[9px] font-bold text-white/90 mt-0.5 truncate max-w-[50px]">
                      {char.name}
                    </span>
                  </div>
                );
              })}

              {/* Center Hub */}
              <div className="size-16 rounded-full bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] border-2 border-white flex items-center justify-center shadow-lg">
                <Sparkles className="size-6 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Spin Trigger Button */}
        {!selectedCompanion && (
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white font-black text-sm md:text-base shadow-xl shadow-pink-600/40 hover:brightness-110 active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
          >
            <Disc3 className={`size-5 ${spinning ? "animate-spin" : ""}`} />
            <span>{spinning ? "Spinning Wheel of Fate..." : "SPIN THE ROULETTE"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
