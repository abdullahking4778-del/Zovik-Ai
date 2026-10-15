"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, X, ArrowRight, Gift } from "lucide-react";
import { PromoModalConfig } from "@/types";

export default function PromoModalPopup() {
  const [modalConfig, setModalConfig] = useState<PromoModalConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/engagement/banner", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.promoModal && data.promoModal.isActive) {
          const cfg: PromoModalConfig = data.promoModal;
          const sessionKey = `zovik_promo_modal_seen_${cfg.id}`;
          const alreadySeen = sessionStorage.getItem(sessionKey);
          if (!alreadySeen || !cfg.showOncePerSession) {
            setModalConfig(cfg);
            // Delay appearance slightly for smooth entrance
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
          }
        }
      })
      .catch((err) => console.warn("[PromoModalPopup] Fetch note:", err));
  }, []);

  const handleClose = () => {
    if (modalConfig) {
      sessionStorage.setItem(`zovik_promo_modal_seen_${modalConfig.id}`, "true");
    }
    setIsOpen(false);
  };

  if (!isOpen || !modalConfig || !modalConfig.isActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1c0e25] via-[#120818] to-[#0a050e] border border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden text-center space-y-5">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 size-48 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 size-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          aria-label="Close promotion"
        >
          <X className="size-4" />
        </button>

        {/* Top Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 text-[#f53b70] text-xs font-black uppercase">
            <Gift className="size-3.5" />
            <span>{modalConfig.badge || "SPECIAL OFFER"}</span>
          </div>
        </div>

        {/* Image / Graphic if provided */}
        {modalConfig.imageUrl && (
          <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
            <Image
              src={modalConfig.imageUrl}
              alt={modalConfig.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Title & Body */}
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {modalConfig.title}
          </h3>
          <p className="text-xs sm:text-sm text-[#cbb6bf] leading-relaxed">
            {modalConfig.body}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {modalConfig.ctaLink ? (
            <Link
              href={modalConfig.ctaLink}
              onClick={handleClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f53b70] via-pink-600 to-[#8b5cf6] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-95"
            >
              <span>{modalConfig.ctaText || "Claim Now"}</span>
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <button
              onClick={handleClose}
              className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
