"use client";

import React from "react";
import { Lock, EyeOff, Eye, CheckCircle2, AlertCircle } from "lucide-react";

interface AdminSettingsTabProps {
  showPasswordDetails: boolean;
  setShowPasswordDetails: (show: boolean) => void;
  activeMasterPassword: string;
  passwordStatusMsg: { type: "success" | "error"; text: string } | null;
  currentMasterPassword: string;
  setCurrentMasterPassword: (val: string) => void;
  newMasterPassword: string;
  setNewMasterPassword: (val: string) => void;
  confirmMasterPassword: string;
  setConfirmMasterPassword: (val: string) => void;
  isUpdatingPassword: boolean;
  handleChangePassword: (e: React.FormEvent) => Promise<void> | void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  showPasswordDetails,
  setShowPasswordDetails,
  activeMasterPassword,
  passwordStatusMsg,
  currentMasterPassword,
  setCurrentMasterPassword,
  newMasterPassword,
  setNewMasterPassword,
  confirmMasterPassword,
  setConfirmMasterPassword,
  isUpdatingPassword,
  handleChangePassword,
}) => {
  return (
    <div className="p-6 rounded-3xl bg-[#140b1c] border border-white/5 max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">AI Engine & Master Settings</h2>
        <p className="text-xs text-[#aeaeae]">
          Configure backend engine and manage your Master Access credentials
        </p>
      </div>

      {/* Active AI Model Card */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
        <span className="text-white font-bold block text-xs">Active Chat Model</span>
        <span className="font-mono text-emerald-400 text-xs">
          qwen/qwen3.8-27b (Fallback: gpt-oss-120b)
        </span>
        <p className="text-[11px] text-[#aeaeae] mt-1">
          Optimal for multilingual conversations, emotional roleplay, and Roman Urdu.
        </p>
      </div>

      {/* Live Master Password Changer Form */}
      <div className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Lock className="size-4 text-[#f53b70]" />
            <span className="text-sm font-black text-white">Change Master Password</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10">
            <span className="text-[10px] text-[#aeaeae]">Active:</span>
            <span className="font-mono text-amber-400 text-[11px]">
              {showPasswordDetails ? activeMasterPassword : "••••••••••••"}
            </span>
            <button
              type="button"
              onClick={() => setShowPasswordDetails(!showPasswordDetails)}
              className="text-[#aeaeae] hover:text-white ml-1 cursor-pointer"
              title={showPasswordDetails ? "Hide password" : "Show active password"}
            >
              {showPasswordDetails ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            </button>
          </div>
        </div>

        {passwordStatusMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
              passwordStatusMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {passwordStatusMsg.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{passwordStatusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
          <div>
            <label className="text-[#aeaeae] block mb-1 font-bold">Current Master Password</label>
            <input
              type="password"
              required
              value={currentMasterPassword}
              onChange={(e) => setCurrentMasterPassword(e.target.value)}
              placeholder="Enter current password (e.g. #Abdullah786099#)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-[#f53b70]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[#aeaeae] block mb-1 font-bold">New Master Password</label>
              <input
                type="password"
                required
                value={newMasterPassword}
                onChange={(e) => setNewMasterPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-[#f53b70]"
              />
            </div>
            <div>
              <label className="text-[#aeaeae] block mb-1 font-bold">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmMasterPassword}
                onChange={(e) => setConfirmMasterPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono outline-none focus:border-[#f53b70]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f53b70] via-[#ff5b8c] to-[#8b5cf6] text-white font-extrabold text-xs shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 mt-2 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Lock className="size-3.5" />
            <span>
              {isUpdatingPassword ? "Updating Password..." : "Save New Master Password 🔐"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
