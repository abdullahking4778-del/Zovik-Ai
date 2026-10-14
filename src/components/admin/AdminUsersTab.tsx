"use client";

import React from "react";
import Image from "next/image";
import { Search, Crown, HardDrive, Edit3, Trash2, X, Calendar, Check, RefreshCw, Coins, Gift, Download, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [tierFilter, setTierFilter] = React.useState<"all" | "free" | "plus" | "vip">("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  const [editingUser, setEditingUser] = React.useState<UserAccount | null>(null);
  const [editUserTier, setEditUserTier] = React.useState<"free" | "plus" | "vip">("free");
  const [editUserDays, setEditUserDays] = React.useState<number>(30);
  const [editUserStorageDays, setEditUserStorageDays] = React.useState<number>(35);
  const [isSavingUser, setIsSavingUser] = React.useState<boolean>(false);

  // Coins Control Modal State
  const [coinTargetUser, setCoinTargetUser] = React.useState<UserAccount | null>(null);
  const [coinAmount, setCoinAmount] = React.useState<number>(100);
  const [coinActionType, setCoinActionType] = React.useState<"BONUS" | "ADJUSTMENT">("BONUS");
  const [coinReason, setCoinReason] = React.useState<string>("Promotional Bonus 🎁");
  const [isSavingCoins, setIsSavingCoins] = React.useState<boolean>(false);
  const [coinStatusMsg, setCoinStatusMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleOpenCoinsModal = (user: UserAccount) => {
    setCoinTargetUser(user);
    setCoinAmount(100);
    setCoinActionType("BONUS");
    setCoinReason("Promotional Bonus 🎁");
    setCoinStatusMsg(null);
  };

  const handleSaveUserCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coinTargetUser) return;
    if (!coinAmount || coinAmount <= 0) {
      alert("Amount must be at least 1 coin");
      return;
    }
    if (!coinReason || coinReason.trim().length < 4) {
      alert("Please provide an audit reason (min 4 characters)");
      return;
    }

    setIsSavingCoins(true);
    setCoinStatusMsg(null);
    try {
      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zovik-admin-request": "1",
        },
        body: JSON.stringify({
          targetUserId: coinTargetUser.id || coinTargetUser.email,
          amount: Math.floor(coinAmount),
          type: coinActionType,
          reason: coinReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (setUsers) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === coinTargetUser.id
                ? {
                    ...u,
                    coins:
                      coinActionType === "BONUS"
                        ? (u.coins || 0) + coinAmount
                        : Math.max(0, (u.coins || 0) - coinAmount),
                  }
                : u
            )
          );
        }
        setCoinStatusMsg({
          type: "success",
          text: `✓ Successfully ${coinActionType === "BONUS" ? "gifted" : "adjusted"} ${coinAmount} coins for ${coinTargetUser.name || coinTargetUser.email}!`,
        });
        setTimeout(() => {
          setCoinTargetUser(null);
          setCoinStatusMsg(null);
          onRefreshUsers?.();
        }, 1200);
      } else {
        setCoinStatusMsg({ type: "error", text: data.error || "Failed to update coins." });
      }
    } catch {
      setCoinStatusMsg({ type: "error", text: "Network error updating coins." });
    } finally {
      setIsSavingCoins(false);
    }
  };

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

    try {
      const headers = getAuthHeaders ? getAuthHeaders() : {};
      const params = new URLSearchParams({ userId });
      if (email) params.append("email", email);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        method: "DELETE",
        headers,
      });

      const d = await res.json().catch(() => ({}));

      if (res.status === 207) {
        // Partial deletion (HTTP 207 Multi-Status)
        const note = d.authNote ? `\n\nNotice: ${d.authNote}` : "";
        alert(
          `Partial Cleanup (207 Multi-Status):\n${d.message || "User deactivated and tombstoned, but some cloud providers had partial cleanup."}${note}`
        );
        if (setUsers) {
          setUsers((prev) => prev.filter((u) => u.id !== userId && (!email || u.email !== email)));
        }
      } else if (res.ok) {
        // Full purge (HTTP 200)
        if (setUsers) {
          setUsers((prev) => prev.filter((u) => u.id !== userId && (!email || u.email !== email)));
        }
      } else {
        alert(d.error || "Failed to delete user");
      }
      onRefreshUsers?.();
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("Network error: Could not reach deletion server");
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

  const handleExportUsersCsv = () => {
    if (users.length === 0) {
      alert("No users to export.");
      return;
    }
    const headers = ["ID", "Name", "Email", "Tier", "VIP", "Coins", "Subscription Days", "Storage Retention Days", "Registered Date"];
    const rows = users.map((u) => [
      `"${u.id}"`,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      `"${u.tier || "free"}"`,
      u.isVip ? "true" : "false",
      u.coins || 0,
      u.subscriptionDays || 0,
      u.storageRetentionDays || 7,
      `"${new Date(u.createdAt).toISOString()}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `zovik_users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredUsers = React.useMemo(() => {
    const q = userSearchQuery.toLowerCase().trim();
    return users.filter((u) => {
      if (tierFilter !== "all") {
        const isUserVip = u.tier === "vip" || u.isVip;
        const isUserPlus = u.tier === "plus";
        if (tierFilter === "vip" && !isUserVip) return false;
        if (tierFilter === "plus" && (!isUserPlus || isUserVip)) return false;
        if (tierFilter === "free" && (isUserVip || isUserPlus)) return false;
      }
      if (!q) return true;
      return (
        (u.email || "").toLowerCase().includes(q) ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.tier || "").toLowerCase().includes(q)
      );
    });
  }, [users, userSearchQuery, tierFilter]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const tierCounts = React.useMemo(() => {
    let free = 0;
    let plus = 0;
    let vip = 0;
    for (const u of users) {
      if (u.tier === "vip" || u.isVip) vip++;
      else if (u.tier === "plus") plus++;
      else free++;
    }
    return { all: users.length, free, plus, vip };
  }, [users]);

  return (
    <div className="space-y-4">
      {/* 1. Header with Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Registered Users & Subscriptions</h2>
          <p className="text-xs text-[#aeaeae]">
            Real Firestore user data, active subscriptions, and cloud storage retention rules.
          </p>
        </div>

        <button
          onClick={handleExportUsersCsv}
          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Download className="size-3.5 text-emerald-400" />
          <span>Export Users CSV</span>
        </button>
      </div>

      {/* 2. Tier Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-[#140b1c] border border-white/5">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All Users", count: tierCounts.all },
            { id: "vip", label: "VIP Only", count: tierCounts.vip },
            { id: "plus", label: "Plus Only", count: tierCounts.plus },
            { id: "free", label: "Free Only", count: tierCounts.free },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setTierFilter(tab.id as typeof tierFilter);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                tierFilter === tab.id
                  ? tab.id === "vip"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                    : tab.id === "plus"
                    ? "bg-pink-500 text-white shadow-md shadow-pink-500/30"
                    : "bg-white text-black"
                  : "bg-white/5 text-[#aeaeae] hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                tierFilter === tab.id ? "bg-black/20 text-inherit font-black" : "bg-white/10 text-white/70"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Email / Name Search Bar */}
        <div className="relative flex items-center min-w-[260px]">
          <Search className="absolute left-3 size-4 text-[#aeaeae] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by email, name or tier..."
            value={userSearchQuery}
            onChange={(e) => {
              setUserSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-[#666] outline-none focus:border-[#f53b70] transition-colors"
          />
          {userSearchQuery && (
            <button
              onClick={() => {
                setUserSearchQuery("");
                setCurrentPage(1);
              }}
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
              <th className="p-4">Coins Balance</th>
              <th className="p-4">Subscription Plan</th>
              <th className="p-4">Duration & Expiry</th>
              <th className="p-4">Storage Retention</th>
              <th className="p-4">Registered Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedUsers.map((u) => {
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

                    {/* Coins Balance */}
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black text-xs font-mono shadow-sm">
                        <span>🪙</span>
                        <span>{(u.coins ?? 0).toLocaleString()}</span>
                        <span className="text-[9px] text-amber-400/70 font-sans uppercase">Coins</span>
                      </span>
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
                      {/* Coins Gift / Deduct Action */}
                      <button
                        onClick={() => handleOpenCoinsModal(u)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs inline-flex items-center space-x-1 transition-all"
                        title="Gift Bonus Coins or Deduct"
                      >
                        <Coins className="size-3 text-amber-400" />
                        <span>Coins</span>
                      </button>

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
            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#aeaeae]">
                  {userSearchQuery || tierFilter !== "all"
                    ? "No users match your search or tier filter."
                    : "No users registered yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalUserPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1 text-xs">
          <span className="text-[#aeaeae]">
            Showing <strong className="text-white">{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
            <strong className="text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</strong> of{" "}
            <strong className="text-white">{filteredUsers.length}</strong> users
          </span>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-[#140b1c] border border-white/10 text-white disabled:opacity-40 hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="px-3 py-1 rounded-xl bg-[#140b1c] border border-white/10 text-white font-mono font-bold">
              {currentPage} / {totalUserPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalUserPages, p + 1))}
              disabled={currentPage === totalUserPages}
              className="p-2 rounded-xl bg-[#140b1c] border border-white/10 text-white disabled:opacity-40 hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

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

      {/* ================= MANAGE USER COINS MODAL ================= */}
      {coinTargetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setCoinTargetUser(null)}
        >
          <div
            className="relative max-w-md w-full bg-[#150d1d] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="size-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <Coins className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Manage User Coins</h3>
                  <p className="text-[11px] text-[#aeaeae] truncate max-w-[240px]">
                    {coinTargetUser.name} ({coinTargetUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCoinTargetUser(null)}
                className="size-7 rounded-full bg-white/5 hover:bg-white/10 text-[#aeaeae] flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Current Balance Card */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <span className="text-xs text-amber-300 font-bold">Current Account Balance</span>
              <span className="text-base font-black text-amber-400 font-mono">
                🪙 {(coinTargetUser.coins ?? 0).toLocaleString()} Coins
              </span>
            </div>

            <form onSubmit={handleSaveUserCoins} className="space-y-4">
              {/* Type Toggle: Gift vs Deduct */}
              <div>
                <label className="block text-[11px] font-bold text-white/80 mb-1.5">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCoinActionType("BONUS")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      coinActionType === "BONUS"
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm"
                        : "bg-white/5 border-white/5 text-[#aeaeae] hover:text-white"
                    }`}
                  >
                    🎁 Gift / Bonus (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoinActionType("ADJUSTMENT")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      coinActionType === "ADJUSTMENT"
                        ? "bg-red-500/20 border-red-500/50 text-red-300 shadow-sm"
                        : "bg-white/5 border-white/5 text-[#aeaeae] hover:text-white"
                    }`}
                  >
                    ⚖️ Deduct / Adjust (-)
                  </button>
                </div>
              </div>

              {/* Quick Amount Pills */}
              <div>
                <label className="block text-[11px] font-bold text-white/80 mb-1.5">Quick Preset Amount</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[50, 100, 250, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCoinAmount(amt)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        coinAmount === amt
                          ? "bg-amber-500/30 border-amber-400 text-amber-300"
                          : "bg-white/5 border-white/5 text-[#aeaeae] hover:text-white"
                      }`}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Coins Amount */}
              <div>
                <label className="block text-[11px] font-bold text-white/80 mb-1">Coins Amount</label>
                <input
                  type="number"
                  min="1"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono font-bold text-sm focus:border-amber-400 outline-none"
                  required
                />
              </div>

              {/* Audit Reason */}
              <div>
                <label className="block text-[11px] font-bold text-white/80 mb-1">
                  Reason for Audit Ledger (Min 4 chars)
                </label>
                <input
                  type="text"
                  value={coinReason}
                  onChange={(e) => setCoinReason(e.target.value)}
                  placeholder="e.g. Welcome Gift, Contest Winner, Support Refund..."
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-amber-400 outline-none"
                  required
                />
              </div>

              {coinStatusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    coinStatusMsg.type === "success"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  {coinStatusMsg.text}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingCoins}
                  className={`flex-1 py-3 rounded-xl text-black font-black text-xs shadow-lg hover:brightness-110 disabled:opacity-60 transition-all flex items-center justify-center space-x-2 ${
                    coinActionType === "BONUS"
                      ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                      : "bg-gradient-to-r from-amber-400 to-orange-400"
                  }`}
                >
                  {isSavingCoins ? (
                    <>
                      <RefreshCw className="size-4 animate-spin text-black" />
                      <span>Processing Ledger...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-4 text-black" />
                      <span>{coinActionType === "BONUS" ? `Gift +${coinAmount} Coins` : `Deduct -${coinAmount} Coins`}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCoinTargetUser(null)}
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
