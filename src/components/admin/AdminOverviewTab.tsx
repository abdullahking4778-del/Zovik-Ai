import React from "react";
import { CreditCard, Cpu, Flame } from "lucide-react";
import { UserAccount, PaymentRequest } from "@/types";

interface AdminOverviewTabProps {
  users: UserAccount[];
  payments: PaymentRequest[];
  totalRevenuePKR: number;
  handleApprovePayment?: (paymentId: string) => void;
  onApprovePayment?: (paymentId: string) => void;
}

export function AdminOverviewTab({
  users,
  payments,
  totalRevenuePKR,
  handleApprovePayment,
  onApprovePayment,
}: AdminOverviewTabProps) {
  const approveAction = handleApprovePayment || onApprovePayment || (() => {});
  const pendingPayments = payments.filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#140b1c] border border-white/5">
          <span className="text-xs text-[#aeaeae]">Total Registered Users</span>
          <div className="text-3xl font-black text-white mt-1">{users.length}</div>
          <span className="text-[10px] text-emerald-400 font-bold">100% Free DB Storage</span>
        </div>

        <div className="p-5 rounded-3xl bg-[#140b1c] border border-white/5">
          <span className="text-xs text-[#aeaeae]">Verified VIP Members</span>
          <div className="text-3xl font-black text-amber-400 mt-1">
            {users.filter((u) => u.isVip || u.tier === "vip" || u.tier === "plus").length}
          </div>
          <span className="text-[10px] text-amber-300 font-bold">Paid Subscriptions</span>
        </div>

        <div className="p-5 rounded-3xl bg-[#140b1c] border border-white/5">
          <span className="text-xs text-[#aeaeae]">Estimated Revenue</span>
          <div className="text-3xl font-black text-emerald-400 mt-1">
            Rs. {totalRevenuePKR.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#aeaeae]">From EasyPaisa/Jazz/Crypto</span>
        </div>

        <div className="p-5 rounded-3xl bg-[#140b1c] border border-white/5">
          <span className="text-xs text-[#aeaeae]">Monthly Running Cost</span>
          <div className="text-3xl font-black text-white mt-1">0 PKR</div>
          <span className="text-[10px] text-emerald-400 font-bold">Groq Free + Zero Server Bill</span>
        </div>
      </div>

      {/* Quick Actions & System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-[#140b1c] border border-white/5 space-y-4">
          <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
            <CreditCard className="size-4 text-[#f53b70]" />
            <span>Pending Payment Approvals ({pendingPayments.length})</span>
          </h3>
          {pendingPayments.length > 0 ? (
            <div className="space-y-2">
              {pendingPayments.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/10"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{p.userEmail}</span>
                    <span className="text-[10px] text-[#aeaeae]">
                      {p.method} • {p.amount} • Trx: {p.trxId}
                    </span>
                  </div>
                  <button
                    onClick={() => approveAction(p.id)}
                    className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-md transition-all active:scale-95"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#aeaeae]">No pending payments. All caught up!</p>
          )}
        </div>

        <div className="p-6 rounded-3xl bg-[#140b1c] border border-white/5 space-y-4">
          <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
            <Cpu className="size-4 text-[#8b5cf6]" />
            <span>AI Engine Health</span>
          </h3>
          <ul className="space-y-2 text-xs text-[#d1c4cd]">
            <li className="flex items-center justify-between">
              <span>Groq LLM Model:</span>
              <strong className="text-emerald-400 font-mono">qwen/qwen3.8-27b</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Multilingual Roman Urdu:</span>
              <strong className="text-emerald-400">Active & Thinking</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Photo Engine:</span>
              <strong className="text-emerald-400 font-mono">Turbo Photorealism</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Voice Engine:</span>
              <strong className="text-emerald-400">Strictly Female Tone (Pitch 1.25)</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
