"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Users,
  Sparkles,
  RefreshCw,
  LogOut,
  ExternalLink,
  Flame,
  CreditCard,
  Film,
  Camera,
  Cpu,
  Tag,
} from "lucide-react";
import { Character, ShortReel, PaymentRequest, UserAccount, PricingPlan } from "@/types";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { AdminSubscriptionsTab } from "@/components/admin/AdminSubscriptionsTab";
import { AdminPlansTab } from "@/components/admin/AdminPlansTab";
import { AdminSettingsTab } from "@/components/admin/AdminSettingsTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminCompanionsTab } from "@/components/admin/AdminCompanionsTab";
import { AdminGalleriesTab } from "@/components/admin/AdminGalleriesTab";
import { AdminShortsTab } from "@/components/admin/AdminShortsTab";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "companions" | "galleries" | "users" | "subscriptions" | "plans" | "shorts" | "settings"
  >("overview");

  // Admin Data State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [shorts, setShorts] = useState<ShortReel[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [previewSlip, setPreviewSlip] = useState<string | null>(null);

  // Dedicated Character Gallery State
  const [selectedGalleryCharId, setSelectedGalleryCharId] = useState<string>("");
  const [workingGallery, setWorkingGallery] = useState<string[]>([]);

  // Settings / Master Password State
  const [showPasswordDetails, setShowPasswordDetails] = useState(false);
  const [activeMasterPassword, setActiveMasterPassword] = useState("");
  const [currentMasterPassword, setCurrentMasterPassword] = useState("");
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getAuthHeaders = (tokenOverride?: string): Record<string, string> => {
    const token = tokenOverride || (typeof window !== "undefined" ? localStorage.getItem("zovik_admin_session") : null) || "";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // Check existing session on mount
  useEffect(() => {
    const sessionToken = localStorage.getItem("zovik_admin_session");
    if (!sessionToken) return;

    fetch("/api/admin/auth", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true);
          fetchAdminData(sessionToken);
        } else {
          localStorage.removeItem("zovik_admin_session");
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  // Sync default character gallery selection
  useEffect(() => {
    if (characters.length > 0 && !selectedGalleryCharId) {
      const first = characters[0];
      setSelectedGalleryCharId(first.id);
      setWorkingGallery(first.gallery && first.gallery.length > 0 ? first.gallery : [first.image]);
    }
  }, [characters, selectedGalleryCharId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        setIsAuthenticated(true);
        localStorage.setItem("zovik_admin_session", data.token);
        fetchAdminData(data.token);
      } else {
        setAuthError(data.error || "Incorrect Password! Access Denied.");
      }
    } catch {
      setAuthError("Network error. Could not connect to authentication service.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("zovik_admin_session");
  };

  const fetchAdminData = async (tokenOverride?: string) => {
    setLoadingData(true);
    const headers = getAuthHeaders(tokenOverride);

    try {
      // 1. Fetch Users
      const uRes = await fetch("/api/admin/users", { headers, cache: "no-store" });
      if (uRes.status === 401) {
        handleLogout();
        return;
      }
      const uData = await uRes.json();
      setUsers(uData.users || []);

      // 2. Fetch Characters & Available Images
      const cRes = await fetch("/api/admin/characters", { headers, cache: "no-store" });
      const cData = await cRes.json();
      setCharacters(cData.characters || []);
      setAvailableImages(cData.availableImages || []);

      // 3. Fetch Subscriptions / Payments
      const pRes = await fetch("/api/subscriptions", { headers, cache: "no-store" });
      const pData = await pRes.json();
      setPayments(pData.payments || []);

      // 4. Fetch Pricing Plans
      const plRes = await fetch("/api/admin/plans", { headers, cache: "no-store" });
      const plData = await plRes.json();
      setPlans(plData.plans || []);

      // 5. Fetch Shorts
      const sRes = await fetch("/api/shorts", { cache: "no-store" });
      const sData = await sRes.json();
      setShorts(sData.shorts || []);
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setLoadingData(false);
    }
  };

  // Payment Actions
  const handleApprovePayment = async (paymentId: string) => {
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: paymentId, action: "approve" }),
      });
      if (res.ok) {
        fetchAdminData();
        alert("Payment Approved! User upgraded to VIP with 30 days active access.");
      }
    } catch {
      alert("Error approving payment");
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!confirm("Reject this payment proof?")) return;
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: paymentId, action: "reject" }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch {
      alert("Error rejecting payment");
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/subscriptions?id=${paymentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      } else {
        alert("Failed to delete payment record");
      }
    } catch {
      alert("Error deleting payment");
    }
  };

  // Plans Actions
  const handleSavePlan = async (plan: PricingPlan) => {
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(plan),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Pricing plan saved successfully! 🏷️");
        fetchAdminData();
      } else {
        alert(data.error || "Failed to save plan");
      }
    } catch {
      alert("Error saving pricing plan");
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pricing plan?")) return;
    try {
      const res = await fetch(`/api/admin/plans?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Plan deleted!");
        fetchAdminData();
      } else {
        alert(data.error || "Failed to delete plan");
      }
    } catch {
      alert("Error deleting plan");
    }
  };

  // Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg(null);

    if (!currentMasterPassword || !newMasterPassword) {
      setPasswordStatusMsg({ type: "error", text: "Please enter current and new password." });
      return;
    }

    if (newMasterPassword !== confirmMasterPassword) {
      setPasswordStatusMsg({ type: "error", text: "New password and Confirm password do not match!" });
      return;
    }

    if (newMasterPassword.length < 6) {
      setPasswordStatusMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const token = localStorage.getItem("zovik_admin_session") || "";
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentMasterPassword,
          newPassword: newMasterPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setPasswordStatusMsg({
        type: "success",
        text: "Master Password successfully updated! New password is now active.",
      });
      setActiveMasterPassword(newMasterPassword);
      setCurrentMasterPassword("");
      setNewMasterPassword("");
      setConfirmMasterPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      setPasswordStatusMsg({ type: "error", text: msg });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const totalRevenuePKR = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + (p.amount || 400), 0);

  // Authentication Guard Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07040a] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#140b1c] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#f53b70]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="text-center space-y-3 mb-8">
            <div className="size-16 rounded-2xl bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center mx-auto shadow-lg shadow-pink-600/30">
              <Lock className="size-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-wide text-white">Owner & Admin Panel</h1>
            <p className="text-xs text-[#aeaeae]">
              Enter master owner password to access the platform control center.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter Master Password..."
                className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/15 text-white placeholder-white/30 text-sm outline-none focus:border-[#f53b70] transition-colors"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-bold">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f53b70] via-[#ff5b8c] to-[#f53b70] text-white text-xs font-black shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
            >
              {authLoading ? "Authenticating..." : "Unlock Control Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07040a] text-white flex flex-col font-sans selection:bg-[#f53b70] selection:text-white">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-[#07040a]/85 backdrop-blur-2xl border-b border-white/5 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-pink-600/30">
            <ShieldCheck className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-black tracking-wide text-white">ZOVIK AI</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase">
                Owner Active
              </span>
            </div>
            <span className="text-[11px] text-[#aeaeae]">Master Control Room</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-colors"
          >
            <span>Live Site</span>
            <ExternalLink className="size-3" />
          </Link>

          <button
            onClick={() => fetchAdminData()}
            title="Refresh Data"
            className="size-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
          >
            <RefreshCw className={`size-4 ${loadingData ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-bold transition-colors"
          >
            <LogOut className="size-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar p-1.5 bg-[#140b1a] border border-white/5 rounded-2xl shrink-0">
          {[
            { id: "overview", label: "Overview & Metrics", icon: Flame },
            { id: "companions", label: `Companions (${characters.length})`, icon: Sparkles },
            { id: "galleries", label: "Photo Sequence & Re-Order 📸", icon: Camera },
            { id: "shorts", label: `Shorts Reels (${shorts.length})`, icon: Film },
            { id: "subscriptions", label: `Payments (${payments.filter((p) => p.status === "pending").length})`, icon: CreditCard },
            { id: "plans", label: `Plans & Offers 🏷️ (${plans.length})`, icon: Tag },
            { id: "users", label: `Users (${users.length})`, icon: Users },
            { id: "settings", label: "AI Engine", icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white shadow-md shadow-pink-600/30"
                    : "text-[#aeaeae] hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <AdminOverviewTab
            users={users}
            totalRevenuePKR={totalRevenuePKR}
            payments={payments}
            handleApprovePayment={handleApprovePayment}
          />
        )}

        {/* TAB 2: COMPANIONS */}
        {activeTab === "companions" && (
          <AdminCompanionsTab
            characters={characters}
            setCharacters={setCharacters}
            availableImages={availableImages}
            setAvailableImages={setAvailableImages}
            getAuthHeaders={getAuthHeaders}
            onManageGallery={(charId) => {
              setSelectedGalleryCharId(charId);
              const target = characters.find((c) => c.id === charId);
              if (target) {
                setWorkingGallery(target.gallery && target.gallery.length > 0 ? target.gallery : [target.image]);
              }
              setActiveTab("galleries");
            }}
          />
        )}

        {/* TAB 3: PHOTO SEQUENCE & RE-ORDER (Jules Item #1 Solution) */}
        {activeTab === "galleries" && (
          <AdminGalleriesTab
            characters={characters}
            selectedGalleryCharId={selectedGalleryCharId}
            setSelectedGalleryCharId={setSelectedGalleryCharId}
            workingGallery={workingGallery}
            setWorkingGallery={setWorkingGallery}
            availableImages={availableImages}
            setAvailableImages={setAvailableImages}
            getAuthHeaders={getAuthHeaders}
            onSaveSuccess={fetchAdminData}
          />
        )}

        {/* TAB 4: SHORTS REELS CMS */}
        {activeTab === "shorts" && (
          <AdminShortsTab
            shorts={shorts}
            setShorts={setShorts}
            getAuthHeaders={getAuthHeaders}
            onRefreshData={fetchAdminData}
          />
        )}

        {/* TAB 5: PAYMENTS & SUBSCRIPTIONS */}
        {activeTab === "subscriptions" && (
          <AdminSubscriptionsTab
            payments={payments}
            setPreviewSlip={setPreviewSlip}
            handleApprovePayment={handleApprovePayment}
            handleRejectPayment={handleRejectPayment}
            handleDeletePayment={handleDeletePayment}
          />
        )}

        {/* TAB 6: PLANS */}
        {activeTab === "plans" && (
          <AdminPlansTab
            plans={plans}
            onSavePlan={handleSavePlan}
            onDeletePlan={handleDeletePlan}
          />
        )}

        {/* TAB 7: USERS */}
        {activeTab === "users" && (
          <AdminUsersTab
            users={users}
            setUsers={setUsers}
            getAuthHeaders={getAuthHeaders}
            onRefreshUsers={fetchAdminData}
          />
        )}

        {/* TAB 8: SETTINGS & MASTER PASSWORD */}
        {activeTab === "settings" && (
          <AdminSettingsTab
            showPasswordDetails={showPasswordDetails}
            setShowPasswordDetails={setShowPasswordDetails}
            activeMasterPassword={activeMasterPassword}
            passwordStatusMsg={passwordStatusMsg}
            currentMasterPassword={currentMasterPassword}
            setCurrentMasterPassword={setCurrentMasterPassword}
            newMasterPassword={newMasterPassword}
            setNewMasterPassword={setNewMasterPassword}
            confirmMasterPassword={confirmMasterPassword}
            setConfirmMasterPassword={setConfirmMasterPassword}
            isUpdatingPassword={isUpdatingPassword}
            handleChangePassword={handleChangePassword}
          />
        )}
      </div>
    </div>
  );
}
