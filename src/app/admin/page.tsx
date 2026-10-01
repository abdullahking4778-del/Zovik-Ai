"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Users,
  Sparkles,
  Crown,
  Trash2,
  Plus,
  RefreshCw,
  LogOut,
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Star,
  Settings,
  X,
  CreditCard,
  Film,
  Check,
  DollarSign,
  Play,
  Camera,
  ImageIcon,
  UploadCloud,
  Eye,
  EyeOff,
  FileArchive,
  Video,
  Search,
  Edit3,
  Calendar,
  HardDrive,
} from "lucide-react";
import { Character, ShortReel, PaymentRequest, UserAccount } from "@/types";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "companions" | "galleries" | "users" | "subscriptions" | "shorts" | "settings"
  >("overview");

  // Admin Data State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [shorts, setShorts] = useState<ShortReel[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [previewSlip, setPreviewSlip] = useState<string | null>(null);

  // User Management State
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editUserTier, setEditUserTier] = useState<"free" | "plus" | "vip">("free");
  const [editUserDays, setEditUserDays] = useState<number>(30);
  const [editUserStorageDays, setEditUserStorageDays] = useState<number>(35);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Dedicated Character Gallery State
  const [selectedGalleryCharId, setSelectedGalleryCharId] = useState<string>("");
  const [workingGallery, setWorkingGallery] = useState<string[]>([]);
  const [newGalleryPhotoUrl, setNewGalleryPhotoUrl] = useState("");
  const [savingGallery, setSavingGallery] = useState(false);

  // Companion Form Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: 21,
    gender: "female",
    style: "realistic",
    category: "Trending",
    badge: "NEW",
    tagline: "",
    desc: "",
    voice: "Sultry Whisper",
    tags: "Flirty, Sassy, Model",
    greeting: "Hey there! So excited to chat with you 💕",
    image: "",
  });

  // Short/Reel Form Modal State
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [reelData, setReelData] = useState({
    characterName: "",
    caption: "",
    videoUrl: "/videos/companions/aria-solis.mp4",
    avatar: "/characters/zovik_01.jpg",
  });

  // Reel Upload & Direct Device File State
  const [reelUploadFile, setReelUploadFile] = useState<File | null>(null);
  const [isUploadingReel, setIsUploadingReel] = useState(false);
  const [reelUploadError, setReelUploadError] = useState("");

  // Gallery Photos Direct Device / ZIP Upload State
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [galleryUploadStatus, setGalleryUploadStatus] = useState<string | null>(null);

  // Master Password Changer State
  const [currentMasterPassword, setCurrentMasterPassword] = useState("");
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [activeMasterPassword, setActiveMasterPassword] = useState("#Abdullah786099#");
  const [showPasswordDetails, setShowPasswordDetails] = useState(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const getAuthHeaders = (tokenOverride?: string) => {
    const token = tokenOverride || (typeof window !== "undefined" ? localStorage.getItem("zovik_admin_session") : "") || "";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // Check saved session on mount and verify with server
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
        localStorage.removeItem("zovik_admin_session");
        setIsAuthenticated(false);
      });
  }, []);

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
      // 1. Fetch Users (Protected)
      const uRes = await fetch("/api/admin/users", { headers });
      if (uRes.status === 401) {
        handleLogout();
        return;
      }
      const uData = await uRes.json();
      setUsers(uData.users || []);

      // 2. Fetch Characters & Images (Protected)
      const cRes = await fetch("/api/admin/characters", { headers });
      const cData = await cRes.json();
      setCharacters(cData.characters || []);
      setAvailableImages(cData.availableImages || []);

      if (cData.availableImages?.length > 0) {
        setFormData((prev) => ({ ...prev, image: cData.availableImages[0] }));
      }

      // 3. Fetch Subscriptions / Payments (Protected)
      const pRes = await fetch("/api/subscriptions", { headers });
      const pData = await pRes.json();
      setPayments(pData.payments || []);

      // 4. Fetch Shorts
      const sRes = await fetch("/api/shorts");
      const sData = await sRes.json();
      setShorts(sData.shorts || []);
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleVip = async (userId: string, currentVip: boolean) => {
    try {
      const userObj = users.find((u) => u.id === userId);
      const newVip = !currentVip;
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          userId, 
          email: userObj?.email,
          isVip: newVip,
          tier: newVip ? "vip" : "free",
          subscriptionDays: newVip ? 30 : 0,
        }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isVip: newVip, tier: newVip ? "vip" : "free" } : u))
        );
      }
    } catch {
      alert("Error updating VIP status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch {
      alert("Error deleting user");
    }
  };

  const handleOpenEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setEditUserTier(user.tier === "vip" ? "vip" : user.tier === "plus" ? "plus" : "free");
    setEditUserDays(user.subscriptionDays || (user.tier === "vip" ? 30 : 0));
    setEditUserStorageDays(user.storageRetentionDays || (user.tier === "vip" ? 35 : user.tier === "plus" ? 30 : 7));
  };

  const handleSaveUserSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: editingUser.id,
          email: editingUser.email,
          tier: editUserTier,
          isVip: editUserTier === "vip",
          subscriptionDays: Number(editUserDays),
          storageRetentionDays: Number(editUserStorageDays),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, ...data.user } : u))
        );
        setEditingUser(null);
      } else {
        alert("Failed to update user");
      }
    } catch {
      alert("Error updating user subscription and storage");
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSaveCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/characters", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        fetchAdminData();
        alert("Companion created and published successfully!");
      }
    } catch {
      alert("Error saving companion");
    }
  };

  const handleDeleteCompanion = async (id: string) => {
    if (!confirm("Delete this companion?")) return;
    try {
      const res = await fetch(`/api/admin/characters?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setCharacters((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      alert("Error deleting companion");
    }
  };

  // Gallery Manager Handlers
  useEffect(() => {
    if (characters.length > 0 && !selectedGalleryCharId) {
      const first = characters[0];
      setSelectedGalleryCharId(first.id);
      setWorkingGallery(first.gallery && first.gallery.length > 0 ? first.gallery : [first.image]);
    }
  }, [characters, selectedGalleryCharId]);

  const handleSelectGalleryChar = (id: string) => {
    setSelectedGalleryCharId(id);
    const target = characters.find((c) => c.id === id);
    if (target) {
      setWorkingGallery(target.gallery && target.gallery.length > 0 ? target.gallery : [target.image]);
    }
  };

  const handleAddPhotoToWorkingGallery = () => {
    if (!newGalleryPhotoUrl.trim()) return;
    if (workingGallery.includes(newGalleryPhotoUrl.trim())) {
      alert("This photo is already in the gallery!");
      return;
    }
    setWorkingGallery([...workingGallery, newGalleryPhotoUrl.trim()]);
    setNewGalleryPhotoUrl("");
  };

  const handleRemovePhotoFromWorkingGallery = (idx: number) => {
    if (workingGallery.length <= 1) {
      alert("A companion must have at least 1 photo in their gallery!");
      return;
    }
    setWorkingGallery(workingGallery.filter((_, i) => i !== idx));
  };

  const handleSaveGallery = async () => {
    if (!selectedGalleryCharId || workingGallery.length === 0) return;
    setSavingGallery(true);
    try {
      const res = await fetch("/api/admin/characters", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          characterId: selectedGalleryCharId,
          gallery: workingGallery,
        }),
      });
      if (res.ok) {
        alert("Companion photo gallery saved successfully! 📸");
        fetchAdminData();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update gallery");
      }
    } catch {
      alert("Error saving gallery");
    } finally {
      setSavingGallery(false);
    }
  };

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

  const handleSaveReel = async (e: React.FormEvent) => {
    e.preventDefault();
    setReelUploadError("");
    setIsUploadingReel(true);

    try {
      const token = localStorage.getItem("zovik_admin_session") || "";

      // If user uploaded a direct video or ZIP file from their device
      if (reelUploadFile) {
        const formData = new FormData();
        formData.append("file", reelUploadFile);
        formData.append("type", "reel");
        formData.append("characterName", reelData.characterName.trim() || "Zovik AI");
        formData.append("caption", reelData.caption.trim() || "New Short Reel 💕");
        formData.append("createReel", "true");

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to upload video");
        }

        setIsAddReelOpen(false);
        setReelUploadFile(null);
        setReelData({
          characterName: "",
          caption: "",
          videoUrl: "/videos/companions/aria-solis.mp4",
          avatar: "/characters/zovik_01.jpg",
        });
        fetchAdminData();
        alert(
          data.isZip
            ? `Extracted and published ${data.totalExtracted} reels from ZIP archive!`
            : "Reel uploaded and published live to Zovik Shorts!"
        );
      } else {
        // Fallback to path submission
        const res = await fetch("/api/shorts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reelData),
        });
        if (res.ok) {
          setIsAddReelOpen(false);
          fetchAdminData();
          alert("Reel added to Zovik Shorts!");
        } else {
          const data = await res.json();
          throw new Error(data.error || "Failed to save reel");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving reel";
      setReelUploadError(msg);
    } finally {
      setIsUploadingReel(false);
    }
  };

  const handleUploadGalleryPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingGallery(true);
    setGalleryUploadStatus("Compressing and uploading images...");

    try {
      const token = localStorage.getItem("zovik_admin_session") || "";
      const newUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "image");

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json();
        if (res.ok) {
          if (data.isZip && Array.isArray(data.files)) {
            data.files.forEach((f: { type?: string; url?: string }) => {
              if (f.type === "image" && f.url) newUrls.push(f.url);
            });
          } else if (data.url) {
            newUrls.push(data.url);
          }
        }
      }

      if (newUrls.length > 0) {
        setWorkingGallery((prev) => [...prev, ...newUrls]);
        setGalleryUploadStatus(`Added ${newUrls.length} new photos to gallery sequence!`);
        setTimeout(() => setGalleryUploadStatus(null), 3500);
      } else {
        setGalleryUploadStatus("No valid images found.");
        setTimeout(() => setGalleryUploadStatus(null), 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setGalleryUploadStatus(`Upload failed: ${msg}`);
    } finally {
      setIsUploadingGallery(false);
    }
  };

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

  const handleDeleteReel = async (id: string) => {
    if (!confirm("Delete this reel?")) return;
    try {
      const res = await fetch(`/api/shorts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setShorts((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      alert("Error deleting reel");
    }
  };

  // --- 1. RENDER MASTER PASSWORD LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#09050d] p-4 text-white">
        <div className="relative w-full max-w-md p-8 rounded-3xl bg-[#130b18] border border-[#f53b70]/30 shadow-2xl shadow-pink-950/40 text-center overflow-hidden">
          <div className="absolute -top-24 inset-x-0 h-40 bg-[#f53b70]/20 blur-3xl pointer-events-none" />

          <div className="size-14 rounded-2xl bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-600/30">
            <Lock className="size-7 text-white" />
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white mb-1">
            ZOVIK AI MASTER PORTAL
          </h2>
          <p className="text-xs text-[#aeaeae] mb-6">
            Enter the owner master password to access system administration
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter Master Password..."
                className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-white placeholder-white/40 text-center text-sm font-mono tracking-widest focus:outline-none focus:border-[#f53b70] transition-colors"
              />
            </div>

            {authError && (
              <div className="flex items-center justify-center space-x-1 text-xs text-red-400">
                <AlertCircle className="size-3.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#f53b70] via-[#ff5b8c] to-[#f53b70] text-white font-extrabold text-sm shadow-xl shadow-pink-600/30 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
            >
              {authLoading ? "Authenticating..." : "Unlock Control Room"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-[#aeaeae]">
            <span>Protected by SHA-512 Master Cryptographic Layer</span>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenuePKR = payments
    .filter((p) => p.status === "approved")
    .reduce((acc, curr) => {
      const amtStr = String(curr.amount || "");
      return acc + (amtStr.includes("3,000") || amtStr === "3000" ? 3000 : 1400);
    }, 0);

  // --- 2. RENDER FULL AUTHENTICATED CONTROL ROOM ---
  return (
    <div className="min-h-screen bg-[#0a060f] text-white flex flex-col">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-[#120a17]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center shadow-md">
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
            { id: "subscriptions", label: `Payments (${payments.filter((p) => p.status === "pending").length})`, icon: CreditCard },
            { id: "companions", label: `Companions (${characters.length})`, icon: Sparkles },
            { id: "galleries", label: "Photo Galleries 📸", icon: Camera },
            { id: "shorts", label: `Shorts Reels (${shorts.length})`, icon: Film },
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

        {/* ================= TAB 1: OVERVIEW & STATS ================= */}
        {activeTab === "overview" && (
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
                  <span>Pending Payment Approvals</span>
                </h3>
                {payments.filter((p) => p.status === "pending").length > 0 ? (
                  <div className="space-y-2">
                    {payments
                      .filter((p) => p.status === "pending")
                      .slice(0, 3)
                      .map((p) => (
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
                            onClick={() => handleApprovePayment(p.id)}
                            className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-md"
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
        )}

        {/* ================= TAB 2: PAYMENTS & SUBSCRIPTIONS ================= */}
        {activeTab === "subscriptions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Payment Requests & Approvals</h2>
                <p className="text-xs text-[#aeaeae]">
                  Review Transaction IDs sent via JazzCash, EasyPaisa, NayaPay, or Binance.
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
                        <span className="font-bold text-[#f53b70]">{p.amount}</span>
                        <span className="block text-[10px] text-[#888]">{p.planName}</span>
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
                            onClick={() => setPreviewSlip(p.screenshot)}
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
                      <td className="p-4 text-right space-x-2">
                        {p.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprovePayment(p.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectPayment(p.id)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 font-bold text-xs transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {p.status === "approved" && (
                          <span className="text-[11px] text-emerald-400 font-bold">✓ Active VIP</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#aeaeae]">
                        No payment requests received yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: COMPANIONS CMS ================= */}
        {activeTab === "companions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Companions Management</h2>
                <p className="text-xs text-[#aeaeae]">Add, customize, and publish new AI models.</p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white text-xs font-bold flex items-center space-x-2 hover:brightness-110 shadow-lg shadow-pink-600/30 transition-all"
              >
                <Plus className="size-4" />
                <span>Add Companion</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center space-x-3 p-3.5 rounded-2xl bg-[#140b1c] border border-white/5"
                >
                  <div className="relative size-14 rounded-xl overflow-hidden shrink-0 bg-black">
                    <Image src={char.image} alt={char.name} fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold text-sm text-white truncate">{char.name}</span>
                      <span className="text-xs text-[#aeaeae]">• {char.age}</span>
                    </div>
                    <span className="text-[11px] text-[#cbb6bf] line-clamp-1">{char.tagline}</span>
                    <span className="text-[10px] text-[#f53b70] font-bold block">{char.category}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => {
                        handleSelectGalleryChar(char.id);
                        setActiveTab("galleries");
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-[#f53b70] text-[11px] font-bold flex items-center space-x-1 transition-all"
                      title="Manage sequential photos"
                    >
                      <Camera className="size-3" />
                      <span>Photos ({char.gallery?.length || 1})</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCompanion(char.id)}
                      className="size-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB: CHARACTER PHOTO GALLERIES ================= */}
        {activeTab === "galleries" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white flex items-center space-x-2">
                  <Camera className="size-5 text-[#f53b70]" />
                  <span>Sequential Photo Galleries CMS</span>
                </h2>
                <p className="text-xs text-[#aeaeae]">
                  Manage private selfies for each character. When Plus (5/day) and VIP (10/day) users click the photo icon (🖼️), photos appear sequentially (#1, #2, #3...).
                </p>
              </div>

              <button
                onClick={handleSaveGallery}
                disabled={savingGallery}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black flex items-center space-x-2 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all shrink-0 disabled:opacity-50"
              >
                <Check className="size-4" />
                <span>{savingGallery ? "Saving..." : "Save Gallery to Database"}</span>
              </button>
            </div>

            {/* Character Selection Card */}
            <div className="p-4 rounded-3xl bg-[#140b1c] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {(() => {
                const current = characters.find((c) => c.id === selectedGalleryCharId) || characters[0];
                return (
                  <>
                    <div className="flex items-center space-x-3.5">
                      <div className="relative size-16 rounded-2xl overflow-hidden bg-black shrink-0 border-2 border-[#f53b70]/40 shadow-lg">
                        <Image src={current?.image || "/characters/zovik_01.jpg"} alt={current?.name || ""} fill className="object-cover" unoptimized />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-extrabold text-base text-white">{current?.name}</h3>
                          <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-400 text-[10px] font-black uppercase">
                            {workingGallery.length} Photos in Sequence
                          </span>
                        </div>
                        <span className="text-xs text-[#aeaeae]">{current?.tagline} • {current?.gender}</span>
                      </div>
                    </div>

                    <div className="w-full md:w-auto flex items-center space-x-2">
                      <label className="text-xs font-bold text-[#aeaeae] whitespace-nowrap">Select Companion:</label>
                      <select
                        value={selectedGalleryCharId}
                        onChange={(e) => handleSelectGalleryChar(e.target.value)}
                        className="flex-1 md:w-64 px-3 py-2 rounded-xl bg-[#1d0f26] border border-white/10 text-white text-xs font-bold outline-none focus:border-[#f53b70]"
                      >
                        {characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.gallery?.length || 1} photos)
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Photo Sequence Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white tracking-wider uppercase">
                  Delivery Order (Click Sequence)
                </span>
                <span className="text-[11px] text-[#aeaeae]">
                  First click sends #1, next click sends #2, until all are seen in round-robin order.
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {workingGallery.map((photoUrl, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-2xl bg-[#140b1c] border border-white/10 overflow-hidden flex flex-col shadow-md hover:border-pink-500/50 transition-all"
                  >
                    <div className="relative aspect-[3/4] w-full bg-black">
                      <Image src={photoUrl} alt={`Photo ${idx + 1}`} fill className="object-cover" unoptimized />
                      <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-pink-500/40 text-pink-300 text-[10px] font-black shadow-md">
                        #{idx + 1} {idx === 0 ? "Default" : `Click ${idx + 1}`}
                      </div>
                      <button
                        onClick={() => handleRemovePhotoFromWorkingGallery(idx)}
                        disabled={workingGallery.length <= 1}
                        title={workingGallery.length <= 1 ? "Must keep at least 1 photo" : "Remove photo"}
                        className="absolute top-2 right-2 z-10 size-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <div className="p-2.5 bg-[#1b1024] flex items-center justify-between">
                      <span className="text-[10px] text-[#cbb6bf] font-mono truncate max-w-[120px]">
                        {photoUrl}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Device Upload / ZIP dropzone */}
            <div className="p-5 rounded-3xl bg-[#140b1c] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                  <UploadCloud className="size-4 text-[#f53b70]" />
                  <span>Upload Photos Directly from PC / Phone or .ZIP Archive</span>
                </h4>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Auto-Compressed to WebP (90% Smaller)
                </span>
              </div>

              <label className="border-2 border-dashed border-white/15 hover:border-[#f53b70] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-black/40 hover:bg-black/60 group">
                <input
                  type="file"
                  multiple
                  accept="image/*,.zip"
                  onChange={(e) => handleUploadGalleryPhotos(e.target.files)}
                  className="hidden"
                  disabled={isUploadingGallery}
                />
                <div className="size-12 rounded-2xl bg-white/5 group-hover:bg-[#f53b70]/20 flex items-center justify-center text-[#f53b70] mb-2 transition-colors">
                  {isUploadingGallery ? (
                    <RefreshCw className="size-6 animate-spin" />
                  ) : (
                    <UploadCloud className="size-6" />
                  )}
                </div>
                <span className="text-xs font-bold text-white group-hover:text-[#f53b70] transition-colors">
                  {isUploadingGallery ? "Compressing & Uploading Photos..." : "Click or Drag & Drop Photos or .ZIP from PC / Phone"}
                </span>
                <span className="text-[11px] text-[#aeaeae] mt-1 text-center">
                  Supports multiple .jpg, .png, .webp files, or a single .zip archive containing photos
                </span>
              </label>

              {galleryUploadStatus && (
                <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-bold flex items-center space-x-2">
                  <Check className="size-4 text-pink-400" />
                  <span>{galleryUploadStatus}</span>
                </div>
              )}
            </div>

            {/* Add New Photo Card */}
            <div className="p-5 rounded-3xl bg-[#140b1c] border border-white/5 space-y-4">
              <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <Plus className="size-4 text-[#f53b70]" />
                <span>Add Next Photo to this Companion's Sequence</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-[#aeaeae] block mb-1 font-bold">Image URL or Local Path</label>
                  <input
                    type="text"
                    placeholder="/characters/zovik_01.jpg or https://..."
                    value={newGalleryPhotoUrl}
                    onChange={(e) => setNewGalleryPhotoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-medium outline-none focus:border-[#f53b70]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#aeaeae] block mb-1 font-bold">Or Pick Local Active Asset</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) setNewGalleryPhotoUrl(e.target.value);
                    }}
                    value=""
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-medium outline-none focus:border-[#f53b70]"
                  >
                    <option value="">Choose local image...</option>
                    {availableImages.map((img) => (
                      <option key={img} value={img}>
                        {img}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleAddPhotoToWorkingGallery}
                  disabled={!newGalleryPhotoUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white text-xs font-bold hover:brightness-110 shadow-md shadow-pink-600/20 disabled:opacity-40 transition-all flex items-center space-x-1.5"
                >
                  <Plus className="size-4" />
                  <span>Add to Gallery Sequence</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SHORTS & REELS CMS ================= */}
        {activeTab === "shorts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Zovik Shorts CMS</h2>
                <p className="text-xs text-[#aeaeae]">Manage vertical character reels with video files.</p>
              </div>

              <button
                onClick={() => setIsAddReelOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white text-xs font-bold flex items-center space-x-2 hover:brightness-110 shadow-lg shadow-pink-600/30 transition-all"
              >
                <Plus className="size-4" />
                <span>Add Video Reel</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shorts.map((reel) => (
                <div
                  key={reel.id}
                  className="p-4 rounded-3xl bg-[#140b1c] border border-white/5 space-y-3"
                >
                  <div className="relative aspect-[9/14] w-full rounded-2xl overflow-hidden bg-black">
                    <video
                      src={reel.videoUrl}
                      poster={reel.avatar}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="size-full object-cover"
                    />
                  </div>

                  <div>
                    <h4 className="font-black text-white text-sm">{reel.characterName}</h4>
                    <p className="text-xs text-[#aeaeae] line-clamp-2">{reel.caption}</p>
                    <span className="text-[10px] text-white/40 block mt-1 font-mono">
                      File: {reel.videoUrl}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteReel(reel.id)}
                    className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors"
                  >
                    Delete Reel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: USERS & VIP ================= */}
        {activeTab === "users" && (
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
                              onClick={() => handleDeleteUser(u.id)}
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
        )}

        {/* ================= TAB 6: SETTINGS ================= */}
        {activeTab === "settings" && (
          <div className="p-6 rounded-3xl bg-[#140b1c] border border-white/5 max-w-xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">AI Engine & Master Settings</h2>
              <p className="text-xs text-[#aeaeae]">Configure backend engine and manage your Master Access credentials</p>
            </div>

            {/* Active AI Model Card */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-white font-bold block text-xs">Active Chat Model</span>
              <span className="font-mono text-emerald-400 text-xs">qwen/qwen3.8-27b (Fallback: gpt-oss-120b)</span>
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
                  <span>{isUpdatingPassword ? "Updating Password..." : "Save New Master Password 🔐"}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Add Companion Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#170e20] border border-white/10 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-black">Publish New Companion</h3>
              <button onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveCompanion} className="space-y-3 text-xs">
              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mia Khalifa"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  >
                    <option value="Trending">Trending</option>
                    <option value="Popular">Popular</option>
                    <option value="Roleplay">Roleplay</option>
                    <option value="New">New</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. Flirty & Sassy • Sweet Romance"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Personality & Backstory</label>
                <textarea
                  rows={3}
                  value={formData.desc}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  placeholder="Describe her character, style, how she speaks..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Select Local Avatar</label>
                <select
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                >
                  {availableImages.map((img) => (
                    <option key={img} value={img}>
                      {img}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white font-extrabold text-xs shadow-md mt-4"
              >
                Publish Companion
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Reel Modal */}
      {isAddReelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#170e20] border border-white/10 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-black">Add Short Reel</h3>
              <button onClick={() => setIsAddReelOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveReel} className="space-y-3 text-xs">
              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Character Name</label>
                <input
                  type="text"
                  required
                  value={reelData.characterName}
                  onChange={(e) => setReelData({ ...reelData, characterName: e.target.value })}
                  placeholder="e.g. Elena"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Caption</label>
                <input
                  type="text"
                  required
                  value={reelData.caption}
                  onChange={(e) => setReelData({ ...reelData, caption: e.target.value })}
                  placeholder="e.g. Late night mood... Chat with me 💕"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                />
              </div>

              {/* Direct Video / ZIP File Upload Zone */}
              <div className="space-y-1.5">
                <label className="text-[#aeaeae] block text-xs font-bold">
                  Upload Video from PC / Phone (or .ZIP Archive)
                </label>
                <label className="border-2 border-dashed border-white/15 hover:border-[#f53b70] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-black/40 hover:bg-black/60 group">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReelUploadFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    disabled={isUploadingReel}
                  />
                  <div className="size-10 rounded-xl bg-white/5 group-hover:bg-[#f53b70]/20 flex items-center justify-center text-[#f53b70] mb-1.5 transition-colors">
                    {reelUploadFile ? (
                      reelUploadFile.name.endsWith(".zip") ? (
                        <FileArchive className="size-5" />
                      ) : (
                        <Video className="size-5" />
                      )
                    ) : (
                      <UploadCloud className="size-5" />
                    )}
                  </div>
                  {reelUploadFile ? (
                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                      <span>✓ {reelUploadFile.name} ({(reelUploadFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setReelUploadFile(null);
                        }}
                        className="text-red-400 hover:text-red-300 ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-white group-hover:text-[#f53b70] transition-colors">
                        Click or Drag & Drop Video (.mp4/.webm) or .ZIP
                      </span>
                      <span className="text-[10px] text-[#aeaeae] mt-0.5">
                        Direct 0-budget upload from your device to Zovik Shorts
                      </span>
                    </>
                  )}
                </label>
              </div>

              {/* Or Select Existing Video Path fallback */}
              {!reelUploadFile && (
                <div>
                  <label className="text-[#aeaeae] block mb-1 text-[11px] font-bold">
                    Or Select Existing Preset Video
                  </label>
                  <select
                    value={reelData.videoUrl}
                    onChange={(e) => setReelData({ ...reelData, videoUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono"
                  >
                    <option value="/videos/companions/aria-solis.mp4">Aria Solis (/videos/companions/aria-solis.mp4)</option>
                    <option value="/videos/companions/raven-steele.mp4">Raven Steele (/videos/companions/raven-steele.mp4)</option>
                    <option value="/videos/companions/victoria-ashford.mp4">Victoria Ashford (/videos/companions/victoria-ashford.mp4)</option>
                    <option value="/videos/companions/francesca-rossi.mp4">Francesca Rossi (/videos/companions/francesca-rossi.mp4)</option>
                    <option value="/videos/companions/genevieve-claire.mp4">Genevieve Claire (/videos/companions/genevieve-claire.mp4)</option>
                    <option value="/videos/companions/mina-sakura.mp4">Mina Sakura (/videos/companions/mina-sakura.mp4)</option>
                  </select>
                </div>
              )}

              {reelUploadError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center space-x-1.5">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{reelUploadError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploadingReel}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f53b70] via-[#ff5b8c] to-[#8b5cf6] text-white font-extrabold text-xs shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 mt-4 cursor-pointer flex items-center justify-center space-x-2"
              >
                {isUploadingReel ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Uploading & Publishing Reel...</span>
                  </>
                ) : (
                  <>
                    <Film className="size-4" />
                    <span>Publish Short Reel 🚀</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Slip / Receipt Zoom Modal */}
      {previewSlip && (
        <div
          onClick={() => setPreviewSlip(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-[#160d1e] p-4 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center"
          >
            <div className="flex items-center justify-between w-full pb-3 border-b border-white/10 mb-3">
              <span className="text-sm font-black text-white">Payment Screenshot / Receipt</span>
              <button
                onClick={() => setPreviewSlip(null)}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>
            <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSlip}
                alt="Payment Slip"
                className="size-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
