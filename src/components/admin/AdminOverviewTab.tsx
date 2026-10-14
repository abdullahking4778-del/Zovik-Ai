import React, { useState, useEffect, useMemo } from "react";
import { CreditCard, Cpu, Activity, Users, MessageSquare, Eye, Sparkles, Coins, Clock, Crown } from "lucide-react";
import { UserAccount, PaymentRequest } from "@/types";

interface AdminOverviewTabProps {
  users: UserAccount[];
  payments: PaymentRequest[];
  totalRevenuePKR: number;
  handleApprovePayment?: (paymentId: string) => void;
  getAuthHeaders?: () => Record<string, string>;
}

export function AdminOverviewTab({
  users,
  payments,
  totalRevenuePKR,
  handleApprovePayment,
}: AdminOverviewTabProps) {
  const approveAction = handleApprovePayment || (() => {});
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const totalCirculatingCoins = users.reduce((acc, u) => acc + (u.coins || 0), 0);

  // Real 7-Day Revenue Calculation from Approved Payments
  const weeklyRevenue = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    // Last 7 days in order
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return {
        label: days[d.getDay()],
        dateStr: d.toISOString().slice(0, 10),
        amount: 0,
      };
    });

    for (const p of payments) {
      if (p.status === "approved" && p.createdAt) {
        const pDate = new Date(p.createdAt).toISOString().slice(0, 10);
        const dayEntry = last7Days.find((d) => d.dateStr === pDate);
        if (dayEntry) {
          const numAmount = Number(p.amount) || 0;
          const pkr = (p.currency === "USDT" || p.currency === "USD") ? numAmount * 280 : numAmount;
          dayEntry.amount += pkr;
        }
      }
    }

    const maxAmount = Math.max(...last7Days.map((d) => d.amount), 1);
    return last7Days.map((d) => ({
      ...d,
      heightPercent: d.amount > 0 ? Math.max(18, Math.round((d.amount / maxAmount) * 100)) : 8,
    }));
  }, [payments]);

  const vipSubscribersCount = useMemo(() => {
    const now = new Date();
    return users.filter((u) => {
      const isTierVip = u.tier === "vip" || u.tier === "plus" || u.isVip;
      if (!isTierVip) return false;
      if (!u.subscriptionEndsAt) return true;
      return new Date(u.subscriptionEndsAt) > now;
    }).length;
  }, [users]);

  const [healthInfo, setHealthInfo] = useState<{ status: string; label: string }>({
    status: "healthy",
    label: "Operational & Active",
  });

  useEffect(() => {
    fetch("/api/admin/clean-cache", {
      headers: { "x-zovik-admin-request": "1" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const isHealthy = data.status === "healthy";
          setHealthInfo({
            status: isHealthy ? "healthy" : "warning",
            label: isHealthy ? "Operational & Active" : "Review Services",
          });
        }
      })
      .catch(() => {});
  }, []);

  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);

  const handleCleanCache = async () => {
    setIsCleaningCache(true);
    setCleanMessage(null);
    try {
      const res = await fetch("/api/admin/clean-cache", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zovik-admin-request": "1",
        },
      });
      const data = await res.json();
      if (res.ok) {
        setCleanMessage(data.message || "✓ All app cache, temporary files, and junk permanently cleaned!");
      } else {
        alert(data.error || "Failed to clean app cache");
      }
    } catch {
      alert("Error executing cache cleaning routine");
    } finally {
      setIsCleaningCache(false);
    }
  };

  // Mock data for Live Chat Monitor
  const [liveChats, setLiveChats] = useState([
    { id: 1, user: "guest_982", companion: "Aria Solis", time: "Just now", status: "typing..." },
    { id: 2, user: "ali_khan", companion: "Raven Steele", time: "1 min ago", status: "active" },
    { id: 3, user: "vip_user_4", companion: "Genevieve Claire", time: "3 mins ago", status: "photo sent" },
    { id: 4, user: "john_doe", companion: "Roxie Stone", time: "5 mins ago", status: "chatting" },
  ]);

  // Simulate real-time updates for the monitor
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveChats((prev) => {
        const newChats = [...prev];
        // Rotate or randomly update statuses to make it look "live"
        if (Math.random() > 0.5) {
          newChats[0].status = newChats[0].status === "typing..." ? "active" : "typing...";
        }
        return newChats;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Maintenance & System Health Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-[#170c22] via-[#1a0f26] to-[#12081a] border border-white/10 shadow-lg gap-3">
        <div className="flex items-center space-x-3">
          <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>System Health & Storage Optimizer</span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                  healthInfo.status === "healthy"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {healthInfo.label}
              </span>
            </h4>
            <p className="text-[11px] text-[#aeaeae]">
              Auto-purges orphaned .tmp files, expired cache, rate-limits, and junk records.
            </p>
          </div>
        </div>

        <button
          onClick={handleCleanCache}
          disabled={isCleaningCache}
          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white font-bold text-xs flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-lg shadow-emerald-900/30"
        >
          <Sparkles className={`size-3.5 ${isCleaningCache ? "animate-spin" : ""}`} />
          <span>{isCleaningCache ? "Cleaning Cache..." : "🧹 Clean App Cache & Junk Now"}</span>
        </button>
      </div>

      {cleanMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>{cleanMessage}</span>
          <button onClick={() => setCleanMessage(null)} className="text-emerald-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* CARD 1: TOTAL USERS */}
        <div className="p-5 rounded-3xl bg-[#140b1c] border border-white/5 relative overflow-hidden group hover:border-[#f53b70]/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="size-12 text-[#f53b70]" />
          </div>
          <span className="text-xs text-[#aeaeae] relative z-10">Total Users</span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1 relative z-10">{users.length}</div>
          <span className="text-[10px] text-emerald-400 font-bold relative z-10">Registered Accounts</span>
        </div>

        {/* CARD 2: CIRCULATING COINS */}
        <div className="p-5 rounded-3xl bg-[#140b1c] border border-amber-500/20 relative overflow-hidden group hover:border-amber-400/50 transition-colors shadow-lg shadow-amber-500/5">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Coins className="size-12 text-amber-400" />
          </div>
          <span className="text-xs text-amber-300 font-bold relative z-10">Circulating Coins</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 relative z-10">
            🪙 {totalCirculatingCoins.toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-300/80 font-bold relative z-10">User Wallet Balances</span>
        </div>

        {/* CARD 3: ESTIMATED REVENUE */}
        <div className="p-5 rounded-3xl bg-[#140b1c] border border-white/5 relative overflow-hidden group hover:border-emerald-400/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="size-12 text-emerald-400" />
          </div>
          <span className="text-xs text-[#aeaeae] relative z-10">Total Revenue</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 relative z-10">
            Rs. {totalRevenuePKR.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-400 font-bold relative z-10">EasyPaisa / Jazz / Crypto</span>
        </div>

        {/* CARD 4: PENDING PAYMENT SLIPS */}
        <div className={`p-5 rounded-3xl bg-[#140b1c] border transition-colors relative overflow-hidden group ${
          pendingPayments.length > 0 ? "border-yellow-500/50 shadow-lg shadow-yellow-500/10" : "border-white/5"
        }`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="size-12 text-yellow-400" />
          </div>
          <span className="text-xs text-[#aeaeae] relative z-10">Pending Slips</span>
          <div className="text-2xl sm:text-3xl font-black text-yellow-400 mt-1 relative z-10 flex items-center space-x-2">
            <span>{pendingPayments.length}</span>
            {pendingPayments.length > 0 && (
              <span className="size-2.5 rounded-full bg-yellow-400 animate-ping inline-block" />
            )}
          </div>
          <span className="text-[10px] text-yellow-300 font-bold relative z-10">
            {pendingPayments.length > 0 ? "Action Required ⏳" : "All Approved ✓"}
          </span>
        </div>

        {/* CARD 5: SUBSCRIBED MEMBERS */}
        <div className="p-5 rounded-3xl bg-[#140b1c] border border-white/5 relative overflow-hidden group hover:border-purple-400/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Crown className="size-12 text-purple-400" />
          </div>
          <span className="text-xs text-[#aeaeae] relative z-10">VIP & Plus Users</span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1 relative z-10">{vipSubscribersCount}</div>
          <span className="text-[10px] text-purple-400 font-bold relative z-10">Active Premium Members</span>
        </div>
      </div>

      {/* Analytics Graph & Live Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Live Analytics & Revenue Graph (Real 7-Day Revenue) */}
        <div className="p-6 rounded-3xl bg-[#140b1c] border border-white/5 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
              <Activity className="size-4 text-emerald-400" />
              <span>7-Day Revenue Trends</span>
            </h3>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md font-bold">
              REAL REVENUE (PKR)
            </span>
          </div>
          
          <div className="flex-1 flex items-end space-x-2 h-40">
            {weeklyRevenue.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center group">
                <div 
                  className={`w-full bg-gradient-to-t ${
                    d.amount > 0 ? "from-emerald-600 to-emerald-400 opacity-90 group-hover:opacity-100" : "from-white/10 to-white/5 opacity-50"
                  } rounded-t-sm transition-opacity relative`}
                  style={{ height: `${d.heightPercent}%` }}
                >
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-black/90 border border-white/10 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-md">
                    Rs. {d.amount.toLocaleString()}
                  </span>
                </div>
                <span className="text-[9px] text-[#aeaeae] mt-2 font-mono">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Live Chat Monitor */}
        <div className="p-6 rounded-3xl bg-[#140b1c] border border-white/5 flex flex-col h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
              <Eye className="size-4 text-[#f53b70]" />
              <span>Companion Activity Simulator</span>
            </h3>
            <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2 py-1 rounded-md font-bold">
              Demo Simulation (User Privacy Protected)
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {liveChats.map((chat) => (
              <div key={chat.id} className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-[#f53b70]/20 to-[#8b5cf6]/20 flex items-center justify-center border border-white/10">
                    <MessageSquare className="size-4 text-white/50" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white">{chat.user}</span>
                      <span className="text-[10px] text-[#aeaeae]">with</span>
                      <span className="text-xs font-bold text-[#f53b70]">{chat.companion}</span>
                    </div>
                    <span className="text-[10px] text-[#aeaeae] flex items-center space-x-1">
                      <span>{chat.time}</span>
                      <span>•</span>
                      <span className={
                        chat.status === 'typing...' ? 'text-amber-400 animate-pulse' :
                        chat.status === 'chatting' ? 'text-emerald-400' :
                        'text-blue-400'
                      }>
                        {chat.status}
                      </span>
                    </span>
                  </div>
                </div>
                <button className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold transition-colors">
                  Inspect
                </button>
              </div>
            ))}
          </div>
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
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
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
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-md transition-all active:scale-95"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center justify-center text-center">
              <CreditCard className="size-6 text-white/20 mb-2" />
              <p className="text-xs text-[#aeaeae]">No pending payments. All caught up!</p>
            </div>
          )}
        </div>

        <div className="p-6 rounded-3xl bg-[#140b1c] border border-white/5 space-y-4">
          <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
            <Cpu className="size-4 text-[#8b5cf6]" />
            <span>AI Engine Health</span>
          </h3>
          <ul className="space-y-3 text-xs text-[#d1c4cd]">
            <li className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5">
              <span>Groq LLM Model:</span>
              <strong className="text-emerald-400 font-mono">qwen/qwen3.8-27b</strong>
            </li>
            <li className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5">
              <span>Multilingual Roman Urdu:</span>
              <strong className="text-emerald-400">Active & Thinking</strong>
            </li>
            <li className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5">
              <span>Photo Engine:</span>
              <strong className="text-emerald-400 font-mono">Turbo Photorealism</strong>
            </li>
            <li className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5">
              <span>Companion Chat Engine:</span>
              <strong className="text-emerald-400 flex items-center space-x-1 font-mono">
                <MessageSquare className="size-3" />
                <span>Stream Optimized</span>
              </strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
