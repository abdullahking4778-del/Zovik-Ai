"use client";

import React from "react";
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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Payment Requests & Approvals</h2>
          <p className="text-xs text-[#aeaeae]">
            Review Transaction IDs, approve VIP tiers, or permanently remove test/old slips.
          </p>
        </div>
      </div>

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
            {payments.map((p) => (
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
                    <span className="text-[11px] text-emerald-400 font-bold mr-1">✓ Active VIP</span>
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
                      🗑️ Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[#aeaeae]">
                  No payment requests received yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
