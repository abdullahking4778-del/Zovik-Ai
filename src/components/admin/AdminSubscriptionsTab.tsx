"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Coins, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Receipt,
  RotateCcw,
  Trash2
} from "lucide-react";
import { PaymentRequest } from "@/types";

interface AdminSubscriptionsTabProps {
  payments: PaymentRequest[];
  handleApprovePayment: (id: string) => Promise<void> | void;
  handleRejectPayment: (id: string) => Promise<void> | void;
  handleDeletePayment?: (id: string) => Promise<void> | void;
  setPreviewSlip: (url: string | null) => void;
}

export const AdminSubscriptionsTab: React.FC<AdminSubscriptionsTabProps> = ({
  payments,
  handleApprovePayment,
  handleRejectPayment,
  handleDeletePayment,
  setPreviewSlip,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount_desc">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Real Metric Calculations
  const stats = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let totalApprovedPKR = 0;
    let totalCoinsCredited = 0;

    for (const p of payments) {
      if (p.status === "pending") pendingCount++;
      else if (p.status === "approved") {
        approvedCount++;
        totalCoinsCredited += p.coins || 0;
        const numAmount = Number(p.amount) || 0;
        if (p.currency === "USDT" || p.currency === "USD") {
          totalApprovedPKR += numAmount * 280;
        } else {
          totalApprovedPKR += numAmount;
        }
      } else if (p.status === "rejected") {
        rejectedCount++;
      }
    }

    return {
      total: payments.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      revenuePKR: totalApprovedPKR,
      coins: totalCoinsCredited,
    };
  }, [payments]);

  // Filtered & Sorted Payments
  const filteredPayments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return payments
      .filter((p) => {
        // Status filter
        if (statusFilter !== "all" && p.status !== statusFilter) return false;

        // Search query
        if (!q) return true;
        return (
          p.userEmail.toLowerCase().includes(q) ||
          p.trxId.toLowerCase().includes(q) ||
          p.method.toLowerCase().includes(q) ||
          p.planName.toLowerCase().includes(q) ||
          (p.amount && p.amount.toString().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortOrder === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortOrder === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortOrder === "amount_desc") {
          return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        }
        return 0;
      });
  }, [payments, searchQuery, statusFilter, sortOrder]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / itemsPerPage));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage]);

  // Export Payments to CSV
  const handleExportCsv = () => {
    if (payments.length === 0) {
      alert("No payment records to export.");
      return;
    }

    const headers = ["ID", "User Email", "Plan Name", "Amount", "Currency", "Method", "Trx ID", "Coins", "Status", "Date"];
    const rows = payments.map((p) => [
      `"${p.id}"`,
      `"${p.userEmail}"`,
      `"${p.planName}"`,
      p.amount,
      `"${p.currency || "PKR"}"`,
      `"${p.method}"`,
      `"${p.trxId}"`,
      p.coins || 0,
      `"${p.status}"`,
      `"${new Date(p.createdAt).toISOString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `zovik_payments_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span>Payment Requests & Approvals</span>
            {stats.pending > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black animate-pulse">
                {stats.pending} Needs Approval
              </span>
            )}
          </h2>
          <p className="text-xs text-[#aeaeae]">
            Review Transaction IDs, approve VIP coin packages, and export financial audit logs.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Download className="size-3.5 text-emerald-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* 2. Stat Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#140b1c] border border-white/5">
          <span className="text-[11px] text-[#aeaeae] font-bold block">Total Slips</span>
          <span className="text-lg font-black text-white mt-0.5 block">{stats.total}</span>
        </div>

        <div className={`p-3.5 rounded-2xl bg-[#140b1c] border transition-colors ${
          stats.pending > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-white/5"
        }`}>
          <span className="text-[11px] text-amber-300 font-bold block flex items-center gap-1.5">
            <Clock className="size-3" />
            <span>Pending Review</span>
          </span>
          <span className="text-lg font-black text-amber-400 mt-0.5 block">{stats.pending}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#140b1c] border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[11px] text-emerald-300 font-bold block flex items-center gap-1.5">
            <TrendingUp className="size-3" />
            <span>Approved Revenue</span>
          </span>
          <span className="text-lg font-black text-emerald-400 mt-0.5 block">
            Rs. {stats.revenuePKR.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#140b1c] border border-amber-500/20">
          <span className="text-[11px] text-amber-300 font-bold block flex items-center gap-1.5">
            <Coins className="size-3" />
            <span>Coins Credited</span>
          </span>
          <span className="text-lg font-black text-amber-400 mt-0.5 block">
            🪙 {stats.coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 3. Search, Filter Tabs & Sorting Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-[#140b1c] border border-white/5">
        {/* Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All", count: stats.total },
            { id: "pending", label: "Pending", count: stats.pending, alert: stats.pending > 0 },
            { id: "approved", label: "Approved", count: stats.approved },
            { id: "rejected", label: "Rejected", count: stats.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id as typeof statusFilter);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                statusFilter === tab.id
                  ? tab.id === "pending"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                    : tab.id === "approved"
                    ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/30"
                    : tab.id === "rejected"
                    ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                    : "bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white"
                  : "bg-white/5 text-[#aeaeae] hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.id ? "bg-black/20 text-inherit font-black" : "bg-white/10 text-white/70"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center space-x-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#aeaeae]" />
            <input
              type="text"
              placeholder="Search email, Trx ID, method..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-[#666] outline-none focus:border-[#f53b70]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#aeaeae] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_desc">Amount (High to Low)</option>
          </select>
        </div>
      </div>

      {/* 4. Table */}
      <div className="overflow-x-auto rounded-3xl bg-[#140b1c] border border-white/5">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1b1024] text-[#aeaeae] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-4">User Email</th>
              <th className="p-4">Plan & Amount</th>
              <th className="p-4">Payment Method</th>
              <th className="p-4">Trx ID / Ref</th>
              <th className="p-4">Slip / Receipt</th>
              <th className="p-4">Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedPayments.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="p-4 font-bold text-white">{p.userEmail}</td>
                <td className="p-4">
                  {p.coins ? (
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs">
                        🪙 {p.coins.toLocaleString()} Coins
                      </span>
                    </div>
                  ) : (
                    <span className="font-bold text-[#f53b70]">{p.amount}</span>
                  )}
                  <span className="block text-[10px] text-[#888] mt-0.5">
                    {p.currency === "USDT" || p.currency === "USD" ? `$${p.amount}` : `Rs. ${p.amount}`} • {p.planName}
                  </span>
                </td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">
                    {p.method}
                  </span>
                </td>
                <td className="p-4 font-mono font-bold text-white">{p.trxId}</td>
                <td className="p-4">
                  {p.screenshot ? (
                    <button
                      onClick={() => setPreviewSlip(p.screenshot || null)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-[11px] transition-all"
                    >
                      <span>View Slip 🖼️</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-white/40">
                      {p.screenshotPurged ? "Auto-Cleaned 🧹" : "No Slip"}
                    </span>
                  )}
                </td>
                <td className="p-4 text-[#aeaeae]">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      p.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : p.status === "rejected"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2 whitespace-nowrap">
                  {p.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprovePayment(p.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition-all active:scale-95"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectPayment(p.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 font-bold text-xs transition-all active:scale-95"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {p.status === "approved" && (
                    <span className="text-[11px] text-emerald-400 font-bold mr-1">
                      {p.coins ? `✓ Credited ${p.coins.toLocaleString()} Coins` : "✓ Active VIP"}
                    </span>
                  )}

                  {/* Delete / Purge button */}
                  {handleDeletePayment && (
                    <button
                      onClick={() => {
                        if (confirm(`Permanently delete payment record (${p.trxId}) and remove slip from cloud storage?`)) {
                          handleDeletePayment(p.id);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/20 text-xs font-bold transition-all active:scale-95 ml-1"
                      title="Permanently remove from database & Supabase Storage"
                    >
                      <Trash2 className="size-3 inline mr-1" />
                      <span>Delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {paginatedPayments.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[#aeaeae]">
                  {searchQuery || statusFilter !== "all" 
                    ? "No payment records match your search or filter."
                    : "No payment requests received yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1 text-xs">
          <span className="text-[#aeaeae]">
            Showing <strong className="text-white">{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
            <strong className="text-white">{Math.min(currentPage * itemsPerPage, filteredPayments.length)}</strong> of{" "}
            <strong className="text-white">{filteredPayments.length}</strong> records
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
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-[#140b1c] border border-white/10 text-white disabled:opacity-40 hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
