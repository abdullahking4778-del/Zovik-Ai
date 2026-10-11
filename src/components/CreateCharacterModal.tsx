"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  X,
  Sparkles,
  Check,
  Wand2,
  User,
  UploadCloud,
  Trash2,
  Camera,
  Flame,
  HeartHandshake,
  Crown,
  Coins,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Character } from "@/types";
import { safeLocalStorage } from "@/lib/storage";
import { useWallet, notifyWalletUpdated } from "@/hooks/useWallet";

interface CreateCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterCreated: (character: Character) => void;
  openPremiumModal?: () => void;
}

export default function CreateCharacterModal({
  isOpen,
  onClose,
  onCharacterCreated,
  openPremiumModal,
}: CreateCharacterModalProps) {
  const { balance, refreshWallet } = useWallet();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingChar, setPendingChar] = useState<Character | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(1);
  const [style, setStyle] = useState<"realistic" | "anime">("realistic");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [name, setName] = useState("");
  const [age, setAge] = useState(21);
  const [hairColor, setHairColor] = useState("Brunette");
  const [bodyType, setBodyType] = useState("Athletic");
  const [relationship, setRelationship] = useState("Girlfriend");
  const [personality, setPersonality] = useState("Flirty & Sassy");
  const [intimacyStyle, setIntimacyStyle] = useState("18+ Uncensored & Spicy");
  const [voice, setVoice] = useState("Sultry Whisper");
  const [customGreeting, setCustomGreeting] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Image file size should be under 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    const isPaid =
      safeLocalStorage.getBoolean("zovik_is_vip") ||
      safeLocalStorage.getRawItem("zovik_tier") === "vip" ||
      safeLocalStorage.getRawItem("zovik_tier") === "plus";
    if (!isPaid) {
      alert("🔒 Create Companion is an exclusive Plus & VIP feature. Please upgrade to unlock!");
      onClose();
      return;
    }

    const charName = name.trim() || (gender === "female" ? "Aria Rose" : "Lucas Black");
    const greetingText =
      customGreeting.trim() ||
      (gender === "female"
        ? `Hey! You finally created me... I've been waiting for you! How do you like my look? 🥰`
        : `Hey... glad you brought me to life. Tell me what's on your mind today? 😉`);

    // Determine avatar image: custom uploaded from device takes highest priority
    let avatarImage = uploadedImage;
    if (!avatarImage) {
      if (gender === "male") {
        avatarImage = "/characters/zovik_31.jpg";
      } else {
        avatarImage =
          style === "anime"
            ? "/characters/zovik_02.jpg"
            : "/characters/zovik_01.jpg";
      }
    }

    const newChar: Character = {
      id: `custom-${Date.now()}`,
      slug: charName.toLowerCase().replace(/\s+/g, "-"),
      name: charName,
      age: age,
      gender: gender,
      style: style,
      tagline: `${relationship} • ${personality}`,
      desc: `Created by you! ${charName} is a ${age}-year-old ${relationship.toLowerCase()} companion with ${hairColor} hair and an ${bodyType} physique. Known for being ${personality.toLowerCase()} with a ${intimacyStyle.toLowerCase()} dynamic.`,
      image: avatarImage,
      badge: "MY AI",
      category: "New",
      series: false,
      verified: true,
      online: true,
      tags: [hairColor, bodyType, relationship, personality, "Custom"],
      voice: voice,
      greeting: greetingText,
      messages: [
        {
          sender: "ai",
          text: greetingText,
          time: "Just now",
          timestamp: Date.now(),
        },
      ],
    };

    setPendingChar(newChar);
    setShowConfirmModal(true);
  };

  const handleConfirmAndCreate = async () => {
    if (!pendingChar) return;
    if (balance < 100) {
      if (openPremiumModal) {
        openPremiumModal();
      } else {
        window.dispatchEvent(new CustomEvent("open-premium-modal"));
      }
      return;
    }

    setIsCreating(true);
    try {
      await onCharacterCreated(pendingChar);
      notifyWalletUpdated();
      setShowConfirmModal(false);
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-2xl bg-[#120d16] rounded-3xl border border-white/10 shadow-2xl p-5 sm:p-8 overflow-hidden my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10"
        >
          <X className="size-4" />
        </button>

        {/* Wizard Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="size-11 rounded-2xl bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-pink-600/30 shrink-0">
            <Wand2 className="size-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">Create Custom Companion</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-sm">
                <Coins className="size-3 text-black" />
                <span>100 Coins</span>
              </span>
            </div>
            <p className="text-xs text-[#aeaeae] mt-0.5">
              Customize looks, relationship dynamic, 18+ intimacy, and upload your own photos
            </p>
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { n: 1, label: "1. Style & Gender" },
            { n: 2, label: "2. Photo & Appearance" },
            { n: 3, label: "3. Relationship & 18+" },
          ].map((s) => (
            <button
              key={s.n}
              onClick={() => setStep(s.n)}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all truncate ${
                step === s.n
                  ? "bg-[#f53b70] text-white shadow-md shadow-pink-600/20"
                  : "bg-white/5 text-[#aeaeae] hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ================= STEP 1: STYLE & GENDER ================= */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-2">
                Companion Art Style
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStyle("realistic")}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    style === "realistic"
                      ? "border-[#f53b70] bg-[#f53b70]/10 text-white shadow-md shadow-pink-600/10"
                      : "border-white/10 bg-white/5 text-[#aeaeae] hover:border-white/20"
                  }`}
                >
                  <span className="block text-base font-bold text-white mb-1">📸 Realistic</span>
                  <span className="text-xs">Photorealistic models with lifelike detail and lighting</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle("anime")}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    style === "anime"
                      ? "border-[#f53b70] bg-[#f53b70]/10 text-white shadow-md shadow-pink-600/10"
                      : "border-white/10 bg-white/5 text-[#aeaeae] hover:border-white/20"
                  }`}
                >
                  <span className="block text-base font-bold text-white mb-1">🌸 Anime</span>
                  <span className="text-xs">Expressive modern anime and digital illustration art</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-2">
                Gender
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    gender === "female"
                      ? "border-[#f53b70] bg-[#f53b70]/20 text-white font-bold"
                      : "border-white/10 bg-white/5 text-[#aeaeae] hover:border-white/20"
                  }`}
                >
                  👩 Female (Girl)
                </button>
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    gender === "male"
                      ? "border-[#f53b70] bg-[#f53b70]/20 text-white font-bold"
                      : "border-white/10 bg-white/5 text-[#aeaeae] hover:border-white/20"
                  }`}
                >
                  👨 Male (Boy)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-1.5">
                  Companion Name
                </label>
                <input
                  type="text"
                  placeholder={gender === "female" ? "e.g. Aria Rose" : "e.g. Lucas Black"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#f53b70]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-1.5">
                  Age ({age} Years)
                </label>
                <input
                  type="range"
                  min="18"
                  max="60"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  className="w-full accent-[#f53b70] mt-2"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white font-bold text-sm shadow-md shadow-pink-600/20 mt-4 hover:brightness-110 transition-all"
            >
              Continue to Photo & Appearance →
            </button>
          </div>
        )}

        {/* ================= STEP 2: PHOTO & APPEARANCE ================= */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Custom File Upload Box */}
            <div>
              <label className="block text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Upload Companion Photo (Mobile / PC)</span>
                <span className="text-[10px] text-pink-400 font-semibold">Supports Any Photo / 18+</span>
              </label>

              <div className="relative border-2 border-dashed border-white/20 hover:border-[#f53b70]/60 rounded-2xl p-4 bg-black/40 transition-colors text-center">
                {uploadedImage ? (
                  <div className="flex flex-col items-center">
                    <div className="relative size-28 rounded-2xl overflow-hidden border-2 border-[#f53b70] shadow-lg mb-3">
                      <Image src={uploadedImage} alt="Uploaded Avatar" fill className="object-cover object-top" unoptimized />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label
                        htmlFor="companion-photo-upload"
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
                      >
                        Change Photo
                      </label>
                      <button
                        type="button"
                        onClick={() => setUploadedImage(null)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold flex items-center space-x-1"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="companion-photo-upload" className="flex flex-col items-center cursor-pointer py-3">
                    <div className="size-12 rounded-full bg-[#f53b70]/20 flex items-center justify-center text-[#f53b70] mb-2">
                      <UploadCloud className="size-6" />
                    </div>
                    <span className="text-xs font-bold text-white mb-0.5">Click to browse from your device</span>
                    <span className="text-[10px] text-[#888]">JPG, PNG, WEBP from your phone or PC</span>
                  </label>
                )}
                <input
                  id="companion-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-2">
                Hair Color & Style
              </label>
              <div className="flex flex-wrap gap-2">
                {["Brunette", "Blonde", "Raven Black", "Fiery Red", "Platinum", "Pastel Pink", "Anime Purple"].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHairColor(h)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      hairColor === h
                        ? "bg-[#f53b70] border-[#f53b70] text-white"
                        : "bg-white/5 border-white/10 text-[#cbb6bf] hover:border-white/20"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-2">
                Body Physique
              </label>
              <div className="flex flex-wrap gap-2">
                {["Petite", "Athletic", "Curvy", "Muscular", "Tall & Lean", "Hourglass"].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBodyType(b)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      bodyType === b
                        ? "bg-[#f53b70] border-[#f53b70] text-white"
                        : "bg-white/5 border-white/10 text-[#cbb6bf] hover:border-white/20"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white font-bold text-sm shadow-md shadow-pink-600/20 hover:brightness-110"
              >
                Continue to Relationship & 18+ →
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: RELATIONSHIP & 18+ INTIMACY ================= */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-2">
                Relationship Dynamic
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  gender === "male" ? "Boyfriend" : "Girlfriend",
                  "Secret Affair",
                  "Dominant",
                  "Submissive",
                  gender === "male" ? "Gym Coach" : "Personal Trainer",
                  gender === "male" ? "Bad Boy Rebel" : "Femme Fatale",
                  "Best Friend",
                  "Fiancé",
                ].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRelationship(r)}
                    className={`p-2.5 rounded-xl text-center border text-xs font-bold transition-all ${
                      relationship === r
                        ? "bg-[#f53b70]/20 border-[#f53b70] text-white"
                        : "bg-white/5 border-white/10 text-[#aeaeae] hover:border-white/20"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-2">
                Intimacy & Chat Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "18+ Uncensored & Spicy",
                  "Romantic & Sweet",
                  "Naughty & Teasing",
                  "Deep & Intellectual",
                ].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIntimacyStyle(i)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      intimacyStyle === i
                        ? "bg-[#f53b70] border-[#f53b70] text-white"
                        : "bg-white/5 border-white/10 text-[#cbb6bf] hover:border-white/20"
                    }`}
                  >
                    {i === "18+ Uncensored & Spicy" ? "🔥 " : i === "Romantic & Sweet" ? "💕 " : i === "Naughty & Teasing" ? "😈 " : "🧠 "}
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#aeaeae] uppercase tracking-wider mb-1.5">
                Custom First Greeting Message (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Hey! I was just thinking about you... What are we doing tonight? 💕"
                value={customGreeting}
                onChange={(e) => setCustomGreeting(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f53b70]"
              />
            </div>

            <div className="flex items-center space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white font-black text-sm shadow-xl shadow-pink-600/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="size-4" />
                <span>Create Companion Now</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= 100 COINS CONFIRMATION POPUP ================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#160f20] border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-950/40 space-y-4 text-left">
            {/* Close confirmation */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 size-7 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="size-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <Coins className="size-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Confirm Creation</h3>
                <p className="text-xs text-[#aeaeae]">Cost: 100 Coins</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#888]">Companion Name:</span>
                <span className="font-bold text-white">{pendingChar?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888]">Creation Fee:</span>
                <span className="font-bold text-amber-400">🪙 100 Coins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888]">Your Wallet Balance:</span>
                <span className="font-bold text-white">🪙 {balance.toLocaleString()} Coins</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between">
                <span className="text-[#888]">Balance After Creation:</span>
                <span className={`font-black ${balance >= 100 ? "text-emerald-400" : "text-red-400"}`}>
                  🪙 {Math.max(0, balance - 100).toLocaleString()} Coins
                </span>
              </div>
            </div>

            {balance < 100 ? (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start space-x-2">
                <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  Aapke wallet mein kafi coins nahi hain (Required: 100, Balance: {balance}). Pehle Coin Store se recharge karein.
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-[#aeaeae] text-center">
                Confirm karne par aapke wallet se 100 Coins deduct kar ke aapka custom companion create ho jayega.
              </p>
            )}

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-1/3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              {balance >= 100 ? (
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={handleConfirmAndCreate}
                  className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Confirm & Deduct 100 Coins 🚀</span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    if (openPremiumModal) {
                      openPremiumModal();
                    } else {
                      window.dispatchEvent(new CustomEvent("open-premium-modal"));
                    }
                  }}
                  className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>Recharge Coins 🪙</span>
                  <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
