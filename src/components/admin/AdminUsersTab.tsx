"use client";

import React from "react";
import Image from "next/image";
import { Search, Crown, HardDrive, Edit3, Trash2, X, Calendar, Check, RefreshCw } from "lucide-react";
import { UserAccount } from "@/types";

interface AdminUsersTabProps {
  users: UserAccount[];
  setUsers?: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  getAuthHeaders?: () => HeadersInit;
  onRefreshUsers?: () => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  setUsers,
  getAuthHeaders,
  onRefreshUsers,
}) => {
  const [userSearchQuery, setUserSearchQuery] = React.useState("");
  const [editingUser, setEditingUser] = React.useState<UserAccount | null>(null);
  const [editUserTier, setEditUserTier] = React.useState<"free" | "plus" | "vip">("free");
  const [editUserDays, setEditUserDays] = React.useState<number>(30);
  const [editUserStorageDays, setEditUserStorageDays] = React.useState<number>(35);
  const [isSavingUser, setIsSavingUser] = React.useState<boolean>(false);

  const handleOpenEditUser = (user: UserAccount) => {
    setEditingUser(user);
    const tier = (user.tier === "vip" || user.isVip) ? "vip" : user.tier === "plus" ? "plus" : "free";
    setEditUserTier(tier);
    setEditUserDays(user.subscriptionDays || (tier === "vip" ? 30 : 0));
    setEditUserStorageDays(user.storageRetentionDays || (tier === "vip" ? 35 : tier === "plus" ? 30 : 7));
  };

  const handleToggleVip = async (userId: string, isVip: boolean) => {
    const nextTier = isVip ? "free" : "vip";
    const nextDays = isVip ? 0 : 30;
    const nextRetention = isVip ? 7 : 35;

    if (setUsers) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, isVip: !isVip, tier: nextTier, subscriptionDays: nextDays, storageRetentionDays: nextRetention }
            : u
        )
      );
    }

    try {
      const headers = getAuthHeaders ? getAuthHeaders() : { "Content-Type": "application/json" };
      await fetch("/api/admin/users", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          userId,
          isVip: !isVip,
          tier: nextTier,
          subscriptionDays: nextDays,
          storageRetentionDays: nextRetention,
        }),
      });
      onRefreshUsers?.();
    } catch (err) {
      console.error("Failed to toggle VIP:", err);
      onRefreshUsers?.();
    }
  };

  const handleDeleteUser = async (userId: string, email?: string) => {
    const displayName = email || userId;
    if (
      !confirm(
        `Are you sure you want to permanently delete user ${displayName}?\nAll user data, subscriptions, and chat sessions will be completely wiped from the app.`
      )
    )
      return;

    if (setUsers) {
      setUsers((prev) => prev.filter((u) => u.id !== userId && (!email || u.email !== email)));
    }

    try {
      const headers = getAuthHeaders ? getAuthHeaders() : {};
      const params = new URLSearchParams({ userId });
      if (email) params.append("email", email);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Failed to delete user");
      }
      onRefreshUsers?.();
    } catch (err) {
      console.error("Failed to delete user:", err);
      onRefreshUsers?.();
    }
  };

  const handleSaveUserSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSavingUser(true);
    try {
      const headers = getAuthHeaders ? getAuthHeaders() : { "Content-Type": "application/json" };
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          userId: editingUser.id,
          email: editingUser.email,
          tier: editUserTier,
          isVip: editUserTier === "vip",
          subscriptionDays: editUserDays,
          storageRetentionDays: editUserStorageDays,
        }),
      });

      if (res.ok) {
        if (setUsers) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === editingUser.id
                ? {
                    ...u,
                    tier: editUserTier,
                    isVip: editUserTier === "vip",
                    subscriptionDays: editUserDays,
                    storageRetentionDays: editUserStorageDays,
                  }
                : u
            )
          );
        }
        setEditingUser(null);
        onRefreshUsers?.();
      } else {
        alert("Failed to update user subscription.");
      }
    } catch (err) {
      console.error("Save user error:", err);
      alert("Network error updating user.");
    } finally {
      setIsSavingUser(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Registered Users & Subscriptions</h2>
          <p className="text-xs text-[#aeaeae]">
            Real Firestore user data, active subscriptions, and cloud storage retention rules.
          </p>
        </div>

        {/* Email / Name Search Bar */}
        <div className="relative flex items-center min-w-[260px]">
          <Search className="absolute left-3 size-4 text-[#aeaeae] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#140b1c] border border-white/10 text-white text-xs placeholder:text-[#666] outline-none focus:border-[#f53b70] transition-colors"
          />
          {userSearchQuery && (
            <button
              onClick={() => setUserSearchQuery("")}
              className="absolute right-3 text-xs text-[#aeaeae] hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-[#140b1c] border border-white/5">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1b1024] text-[#aeaeae] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-4">User Details</th>
              <th className="p-4">Subscription Plan</th>
              <th className="p-4">Duration & Expiry</th>
              <th className="p-4">Storage Retention</th>
              <th className="p-4">Registered Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users
              .filter((u) => {
                const q = userSearchQuery.toLowerCase().trim();
                if (!q) return true;
                return (
                  (u.email || "").toLowerCase().includes(q) ||
                  (u.name || "").toLowerCase().includes(q) ||
                  (u.tier || "").toLowerCase().includes(q)
                );
              })
              .map((u) => {
                const isUserVip = u.tier === "vip" || u.isVip;
                const isUserPlus = u.tier === "plus";
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* User Email & Name */}
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="relative size-8 rounded-xl overflow-hidden bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center shrink-0 border border-white/10">
                          {u.photoURL ? (
                            <Image src={u.photoURL} alt="Avatar" fill className="object-cover" unoptimized />
                          ) : (
                            <span className="font-bold text-white text-[10px]">
                              {(u.name || u.email || "U")[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">{u.name || "Zovik User"}</span>
                          <span className="text-[11px] text-[#aeaeae] block truncate">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Tier Badge */}
                    <td className="p-4">
                      {isUserVip ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-[10px] uppercase shadow-sm">
                          <Crown className="size-3 fill-black" />
                          <span>VIP Plan</span>
                        </span>
                      ) : isUserPlus ? (
                        <span className="px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 font-black text-[10px] uppercase">
                          Plus Plan
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-white/10 text-[#cbb6bf] font-medium text-[10px] uppercase">
                          Free Plan
                        </span>
                      )}
                    </td>

                    {/* Subscription Duration */}
                    <td className="p-4">
                      {u.subscriptionDays && u.subscriptionDays > 0 ? (
                        <div>
                          <span className="font-bold text-emerald-400 block text-xs">
                            {u.subscriptionDays} Days Active
                          </span>
                          {u.subscriptionEndsAt && (
                            <span className="text-[10px] text-[#888] block">
                              Ends: {new Date(u.subscriptionEndsAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : isUserVip ? (
                        <span className="text-amber-400 font-bold">Lifetime VIP</span>
                      ) : (
                        <span className="text-[#666]">Standard Free</span>
                      )}
                    </td>

                    {/* Storage Retention */}
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-semibold">
                        <HardDrive className="size-3" />
                        <span>{u.storageRetentionDays || (isUserVip ? 35 : 7)} Days Retention</span>
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="p-4 text-[#aeaeae]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right space-x-2">
                      {/* Edit Subscription Modal Trigger */}
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#f53b70] hover:text-white text-white font-bold text-xs inline-flex items-center space-x-1 transition-all"
                        title="Edit Plan, Days, and Storage"
                      >
                        <Edit3 className="size-3" />
                        <span>Manage</span>
                      </button>

                      {/* Quick VIP Toggle */}
                      <button
                        onClick={() => handleToggleVip(u.id, isUserVip)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isUserVip
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                            : "bg-white/5 text-[#aeaeae] hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {isUserVip ? "Downgrade" : "Quick VIP"}
                      </button>

                      {/* Delete User */}
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="size-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 inline-flex items-center justify-center transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#aeaeae]">
                  No users registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= EDIT USER SUBSCRIPTION & STORAGE MODAL ================= */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="relative max-w-md w-full bg-[#150d1d] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-white/5 hover:bg-white/10 text-[#aeaeae] hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="size-4" />
            </button>

            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Crown className="size-5 text-[#f53b70]" />
                <span>Manage User Subscription & Storage</span>
              </h3>
              <p className="text-xs text-[#aeaeae] mt-0.5 truncate">
                User: <strong className="text-white">{editingUser.email}</strong>
              </p>
            </div>

            <form onSubmit={handleSaveUserSubscription} className="space-y-4">
              {/* 1. Subscription Tier */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#aeaeae] uppercase">Subscription Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["free", "plus", "vip"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setEditUserTier(t);
                        if (t === "vip") {
                          setEditUserDays(30);
                          setEditUserStorageDays(35);
                        } else if (t === "plus") {
                          setEditUserDays(30);
                          setEditUserStorageDays(30);
                        } else {
                          setEditUserDays(0);
                          setEditUserStorageDays(7);
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        editUserTier === t
                          ? t === "vip"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/20"
                            : t === "plus"
                            ? "bg-pink-500 text-white shadow-md shadow-pink-500/20"
                            : "bg-white text-black"
                          : "bg-black/50 text-[#aeaeae] hover:text-white border border-white/5"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Subscription Duration in Days */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#aeaeae] uppercase flex items-center space-x-1">
                    <Calendar className="size-3.5 text-[#f53b70]" />
                    <span>Subscription Duration (Days)</span>
                  </label>
                  <span className="text-[10px] text-pink-400 font-bold">{editUserDays} Days</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="3650"
                  value={editUserDays}
                  onChange={(e) => setEditUserDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-bold outline-none focus:border-[#f53b70]"
                />
                {/* Presets */}
                <div className="flex items-center space-x-1.5 pt-1">
                  {[7, 30, 60, 90, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setEditUserDays(d)}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] text-white font-medium transition-colors"
                    >
                      +{d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Storage Retention Rule (Days before clear) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#aeaeae] uppercase flex items-center space-x-1">
                    <HardDrive className="size-3.5 text-blue-400" />
                    <span>Storage Retention Period (Days)</span>
                  </label>
                  <span className="text-[10px] text-blue-400 font-bold">{editUserStorageDays} Days Policy</span>
                </div>
                <p className="text-[10px] text-[#888]">
                  Kitne dino tak user ki chats aur photos cloud storage mein save rahengi.
                </p>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={editUserStorageDays}
                  onChange={(e) => setEditUserStorageDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-bold outline-none focus:border-[#f53b70]"
                />
                {/* Presets */}
                <div className="flex items-center space-x-1.5 pt-1">
                  {[
                    { label: "7d (Free)", val: 7 },
                    { label: "30d (Plus)", val: 30 },
                    { label: "35d (VIP)", val: 35 },
                    { label: "90d (Extended)", val: 90 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setEditUserStorageDays(p.val)}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] text-white font-medium transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white font-black text-xs shadow-lg hover:brightness-110 disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
                >
                  {isSavingUser ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Updating User...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      <span>Save & Apply to User</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
