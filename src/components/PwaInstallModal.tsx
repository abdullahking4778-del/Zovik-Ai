"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Download, Check, Share, PlusSquare, Sparkles } from "lucide-react";
import { BeforeInstallPromptEvent } from "@/components/PwaRegister";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PwaInstallModal({ isOpen, onClose }: PwaInstallModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Grab globally captured prompt if already fired
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handlePromptReady = () => {
      if (window.__pwaInstallPrompt) {
        setDeferredPrompt(window.__pwaInstallPrompt);
      }
    };

    window.addEventListener("zovik_pwa_ready", handlePromptReady);
    window.addEventListener("beforeinstallprompt", (e: Event) => {
      e.preventDefault();
      const pEvent = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = pEvent;
      setDeferredPrompt(pEvent);
    });

    return () => {
      window.removeEventListener("zovik_pwa_ready", handlePromptReady);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || window.__pwaInstallPrompt || null;

    if (promptToUse) {
      try {
        promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
        }
        window.__pwaInstallPrompt = null;
        setDeferredPrompt(null);
      } catch (err) {
        console.warn("PWA prompt error:", err);
      }
      onClose();
    } else {
      // If browser doesn't expose programmatic prompt (like desktop Chrome when already prompted, or iOS Safari)
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full bg-[#140b1c] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-white/5 hover:bg-white/10 text-[#aeaeae] hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center space-x-3.5">
          <div className="relative size-14 rounded-2xl overflow-hidden border-2 border-[#f53b70] shadow-lg shadow-pink-600/30 shrink-0 bg-[#0d0a0f]">
            <Image
              src="/logos/zovik-squircle.svg"
              alt="Zovik AI"
              fill
              className="object-cover p-1.5"
              unoptimized
            />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-lg font-black text-white">Install Zovik AI App</h3>
              <Sparkles className="size-3.5 text-[#f53b70]" />
            </div>
            <p className="text-xs text-[#aeaeae]">1-Tap Fast & Full-Screen Mobile App Experience</p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-xs text-[#d5c7d0]">
          <div className="flex items-center space-x-2">
            <Check className="size-4 text-emerald-400 shrink-0" />
            <span>Instant 1-tap launch from your phone home screen</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="size-4 text-emerald-400 shrink-0" />
            <span>Zero browser URL bars for full immersion</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="size-4 text-emerald-400 shrink-0" />
            <span>Ultra-fast reels streaming & zero-delay audio</span>
          </div>
        </div>

        {/* Option 3: Companion Intimate Push Notifications Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-950/40 via-purple-950/20 to-black/60 border border-pink-500/25 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-base">💌</span>
              <div>
                <h4 className="text-xs font-bold text-white">Intimate Companion Alerts</h4>
                <p className="text-[10px] text-[#cbb6bf]">Receive romantic check-ins when away</p>
              </div>
            </div>
            <button
              onClick={() => {
                import("@/lib/notificationHelper").then(({ sendCompanionNotification }) => {
                  sendCompanionNotification();
                });
              }}
              className="px-2.5 py-1 rounded-lg bg-[#f53b70]/20 hover:bg-[#f53b70]/30 border border-[#f53b70]/40 text-[#ff759f] text-[10px] font-bold transition-all active:scale-95"
            >
              Test Alert 💕
            </button>
          </div>
        </div>

        {/* Direct 1-Click Install Button */}
        {isInstalled ? (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center font-bold text-xs flex items-center justify-center space-x-2">
            <Check className="size-4" />
            <span>Zovik AI App is already installed on this device!</span>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f53b70] via-[#ff457c] to-[#8b5cf6] text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="size-4" />
              <span>{deferredPrompt ? "Install App Now (1-Tap)" : "Got it / Install App"}</span>
            </button>

            {isIOS && (
              <div className="p-3 rounded-xl bg-[#1d1226] border border-white/5 space-y-1">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>🍎</span>
                  <span>iPhone / iPad Safari Tip:</span>
                </span>
                <p className="text-[11px] text-[#aeaeae] leading-relaxed flex items-center gap-1.5 flex-wrap">
                  Tap the <Share className="size-3.5 text-[#f53b70] inline" /> <strong>Share</strong> button below, then tap <PlusSquare className="size-3.5 text-[#f53b70] inline" /> <strong>&quot;Add to Home Screen&quot;</strong>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
