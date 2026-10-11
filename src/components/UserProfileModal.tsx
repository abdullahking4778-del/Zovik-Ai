"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  X, 
  Crown, 
  User, 
  ShieldCheck, 
  MessageCircle, 
  LogOut, 
  Sparkles, 
  Calendar, 
  Edit3, 
  Check, 
  Loader2, 
  HardDrive,
  Coins,
  Phone,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  openPremiumModal: () => void;
}

const PRESET_AVATARS = [
  "/characters/zovik_01.jpg",
  "/characters/zovik_02.jpg",
  "/characters/zovik_03.jpg",
  "/characters/zovik_04.jpg",
  "/characters/zovik_05.jpg",
  "/characters/zovik_06.jpg",
];

export default function UserProfileModal({
  isOpen,
  onClose,
  openPremiumModal,
}: UserProfileModalProps) {
  const { user: currentUser, tier: currentTier, userData, updateUserProfile, logout } = useAuth();
  const { balance } = useWallet();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !currentUser) return null;

  const tier = currentTier || userData?.zovik_tier || "free";
  const isVip = tier === "vip";
  const isPlus = tier === "plus";

  const displayName = userData?.name || currentUser.displayName || currentUser.email?.split("@")[0] || "User";
  const avatarUrl = userData?.photoURL || currentUser.photoURL || null;

  const handleStartEdit = () => {
    setEditName(displayName);
    setEditAvatar(avatarUrl || PRESET_AVATARS[0]);
    setIsEditing(true);
    setSaveSuccess(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setSaving(true);
    try {
      await updateUserProfile({
        displayName: editName.trim(),
        photoURL: editAvatar,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
      }, 1200);
    } catch (err) {
      alert("Profile update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const storageRetention = userData?.storageRetentionDays || (isVip ? 35 : isPlus ? 30 : 7);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm sm:max-w-md w-full bg-[#140b1c] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[min(90dvh,680px)] overflow-y-auto scrollbar-thin overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-white/5 hover:bg-white/10 text-[#aeaeae] hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Ambient Glow */}
        <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[#f53b70]/15 to-transparent pointer-events-none" />

        {/* User Header & Avatar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-3.5">
            <div className="relative size-14 rounded-2xl overflow-hidden bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-pink-600/30 border border-white/10 shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} fill className="object-cover" unoptimized />
              ) : (
                <User className="size-7 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white truncate">{displayName}</h3>
              <p className="text-xs text-[#aeaeae] truncate">{currentUser.email}</p>
              <div className="mt-1.5 flex items-center space-x-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-sm">
                  <Coins className="size-3 text-black" />
                  <span>🪙 {balance.toLocaleString()} Coins</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold uppercase border border-emerald-500/30">
                  Active Wallet
                </span>
              </div>
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={handleStartEdit}
              className="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-[#aeaeae] hover:text-white flex items-center justify-center transition-colors"
              title="Edit Profile"
            >
              <Edit3 className="size-4" />
            </button>
          )}
        </div>

        {/* Profile Edit Mode Form */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="p-4 rounded-2xl bg-[#1b1024] border border-white/10 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Edit3 className="size-3.5 text-[#f53b70]" />
                <span>Edit Profile Information</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-[11px] text-[#aeaeae] hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* Change Name */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-[#aeaeae]">Display Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
              />
            </div>

            {/* Change Avatar */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-[#aeaeae]">Select New Avatar</label>
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
                {PRESET_AVATARS.map((av, idx) => {
                  const isSel = editAvatar === av;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditAvatar(av)}
                      className={`relative size-10 rounded-xl overflow-hidden shrink-0 transition-transform ${
                        isSel 
                          ? "ring-2 ring-[#f53b70] scale-110 shadow-md shadow-pink-500/40" 
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image src={av} alt="Avatar" fill className="object-cover" unoptimized />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white font-bold text-xs shadow-md hover:brightness-110 disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </form>
        ) : (
          <div className="p-4 rounded-2xl bg-[#1b1024] border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
              <span className="text-[#aeaeae] flex items-center space-x-1.5">
                <Coins className="size-3.5 text-amber-400" />
                <span className="font-bold text-white">Wallet Balance:</span>
              </span>
              <span className="font-black text-amber-400 text-sm">
                🪙 {balance.toLocaleString()} Coins
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#aeaeae] flex items-center space-x-1.5">
                <MessageCircle className="size-3.5 text-[#f53b70]" />
                <span>AI Text Message:</span>
              </span>
              <span className="font-extrabold text-white">
                1 Coin / msg
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#aeaeae] flex items-center space-x-1.5">
                <Sparkles className="size-3.5 text-amber-400" />
                <span>Private HD Photo:</span>
              </span>
              <span className="font-extrabold text-white">
                5 Coins (Permanent HD)
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#aeaeae] flex items-center space-x-1.5">
                <Phone className="size-3.5 text-purple-400" />
                <span>Voice Call:</span>
              </span>
              <span className="font-extrabold text-white">
                2 Coins / min
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#aeaeae] flex items-center space-x-1.5">
                <Zap className="size-3.5 text-blue-400" />
                <span>Create Companion:</span>
              </span>
              <span className="font-extrabold text-white">
                100 Coins
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
              <span className="text-[#aeaeae] flex items-center space-x-1.5">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                <span>Account Status:</span>
              </span>
              <span className="font-extrabold text-emerald-400">
                Verified & Synced
              </span>
            </div>
          </div>
        )}

        {/* Recharge Coins CTA */}
        <button
          onClick={() => {
            onClose();
            openPremiumModal();
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <Coins className="size-4 text-black" />
          <span>Recharge Coins 🪙 (Min Rs. 50)</span>
        </button>

        {/* Logout */}
        <button
          onClick={async () => {
            await logout();
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
        >
          <LogOut className="size-3.5" />
          <span>Log Out of Account</span>
        </button>
      </div>
    </div>
  );
}

