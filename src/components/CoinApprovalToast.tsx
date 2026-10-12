"use client";

import React, { useState, useEffect } from "react";
import { Coins, Sparkles, X, CheckCircle2 } from "lucide-react";

interface ApprovalAlert {
  amount: number;
  newBalance: number;
  message?: string;
}

export default function CoinApprovalToast() {
  const [alert, setAlert] = useState<ApprovalAlert | null>(null);

  const playSuccessChime = () => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Joyful 3-tone chime: C5 (523Hz), E5 (659Hz), G5 (784Hz)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);

        gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + index * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * 0.12);
        osc.stop(ctx.currentTime + index * 0.12 + 0.36);
      });
    } catch {
      // Audio autoplay policy fallback: silent if blocked
    }
  };

  useEffect(() => {
    const handleCoinsCredited = (e: Event) => {
      const ce = e as CustomEvent<{ amount: number; newBalance: number; message?: string }>;
      if (ce.detail && ce.detail.amount > 0) {
        setAlert(ce.detail);
        playSuccessChime();

        const timer = setTimeout(() => {
          setAlert(null);
        }, 8000);

        return () => clearTimeout(timer);
      }
    };

    window.addEventListener("zovik_coins_credited", handleCoinsCredited);
    return () => {
      window.removeEventListener("zovik_coins_credited", handleCoinsCredited);
    };
  }, []);

  if (!alert) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] sm:w-full select-none animate-bounceIn pointer-events-auto">
      <div className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-r from-[#1f102a] via-[#2a1338] to-[#1a0f26] border-2 border-amber-400/80 shadow-2xl shadow-amber-500/25 backdrop-blur-2xl">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-pink-500 animate-pulse" />

        <div className="flex items-start space-x-3.5">
          {/* Animated Coin Badge */}
          <div className="relative size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 p-0.5 shadow-lg shadow-amber-500/40 shrink-0 flex items-center justify-center animate-bounce">
            <Coins className="size-6 text-black" />
            <Sparkles className="size-3.5 text-white absolute -top-1 -right-1" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center space-x-1.5 text-amber-300">
              <CheckCircle2 className="size-4 shrink-0" />
              <h4 className="text-sm font-black tracking-wide text-white">Payment Slip Approved!</h4>
            </div>

            <p className="text-xs text-[#fef3c7] mt-1 leading-snug font-medium">
              🎉 <strong className="text-amber-300 font-black">Mubarak!</strong> {alert.amount.toLocaleString()} Coins aapke wallet me add ho gaye hain!
            </p>

            <div className="mt-2 flex items-center space-x-3 text-[11px]">
              <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                +{alert.amount.toLocaleString()} Coins
              </span>
              <span className="text-[#d5c7d0]">
                Balance: <strong className="text-white font-black">{alert.newBalance.toLocaleString()} Coins</strong>
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setAlert(null)}
            className="size-7 rounded-full bg-white/10 hover:bg-white/20 text-[#aeaeae] hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
            aria-label="Dismiss alert"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
