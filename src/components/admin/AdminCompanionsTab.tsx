"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Plus,
  Camera,
  Edit3,
  Trash2,
  Video,
  Sparkles,
  Globe,
  UploadCloud,
  ImageIcon,
  Crown,
  Film,
} from "lucide-react";
import { Character } from "@/types";
import { getSafeImageUrl } from "@/lib/imageHelper";

interface AdminCompanionsTabProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  availableImages: string[];
  setAvailableImages: React.Dispatch<React.SetStateAction<string[]>>;
  getAuthHeaders: () => Record<string, string>;
  onManageGallery: (characterId: string) => void;
}

export function AdminCompanionsTab({
  characters,
  setCharacters,
  availableImages,
  setAvailableImages,
  getAuthHeaders,
  onManageGallery,
}: AdminCompanionsTabProps) {
  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companionVideoMode, setCompanionVideoMode] = useState<"url" | "upload" | "preset">("url");
  const [companionVideoFile, setCompanionVideoFile] = useState<File | null>(null);
  const [isUploadingCompanionVideo, setIsUploadingCompanionVideo] = useState(false);
  const [companionAvatarMode, setCompanionAvatarMode] = useState<"upload" | "url" | "preset">("upload");
  const [companionAvatarFile, setCompanionAvatarFile] = useState<File | null>(null);
  const [companionAvatarPreview, setCompanionAvatarPreview] = useState<string | null>(null);
  const [isUploadingCompanionAvatar, setIsUploadingCompanionAvatar] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: 21,
    gender: "female" as "female" | "male",
    style: "realistic" as "realistic" | "anime",
    category: "Trending",
    badge: "NEW",
    tagline: "",
    desc: "",
    voice: "Warm Whisper",
    tags: "Flirty, Sassy, Model",
    greeting: "Hey there! So excited to chat with you 💕",
    image: "/characters/zovik_01.jpg",
    accessTier: "free" as "free" | "vip",
    videoUrl: "",
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompanion, setEditingCompanion] = useState<Character | null>(null);
  const [editVideoMode, setEditVideoMode] = useState<"url" | "upload" | "preset">("url");
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [isUploadingEditVideo, setIsUploadingEditVideo] = useState(false);
  const [editAvatarMode, setEditAvatarMode] = useState<"upload" | "url" | "preset">("preset");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [isUploadingEditAvatar, setIsUploadingEditAvatar] = useState(false);
  const [isSavingCompanionEdit, setIsSavingCompanionEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    age: 21,
    gender: "female" as "female" | "male",
    style: "realistic" as "realistic" | "anime",
    category: "Trending",
    badge: "HOT",
    tagline: "",
    desc: "",
    voice: "Warm Whisper",
    tags: "",
    greeting: "",
    image: "",
    videoUrl: "",
    accessTier: "free" as "free" | "vip",
  });

  const handleOpenEdit = (char: Character) => {
    setEditingCompanion(char);
    setEditFormData({
      id: char.id,
      name: char.name,
      age: char.age,
      gender: (char.gender === "male" ? "male" : "female") as "female" | "male",
      style: (char.style === "anime" ? "anime" : "realistic") as "realistic" | "anime",
      category: char.category || "Trending",
      badge: char.badge || "HOT",
      tagline: char.tagline || "",
      desc: char.desc || "",
      voice: char.voice || "Warm Whisper",
      tags: Array.isArray(char.tags) ? char.tags.join(", ") : char.tags || "",
      greeting: char.greeting || "",
      image: char.image || "/characters/zovik_01.jpg",
      videoUrl: char.videoUrl || "",
      accessTier: (char.accessTier === "vip" || char.accessTier === "plus" || char.isVipOnly) ? "vip" : "free",
    });
    setEditVideoMode(char.videoUrl?.startsWith("http") ? "url" : char.videoUrl ? "preset" : "url");
    setEditVideoFile(null);
    setEditAvatarMode(char.image?.startsWith("http") ? "url" : "preset");
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setIsEditModalOpen(true);
  };

  const handleSaveCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalVideoUrl = formData.videoUrl;
      let finalImageUrl = formData.image || availableImages[0] || "/characters/zovik_01.jpg";

      if (companionVideoMode === "upload" && companionVideoFile) {
        setIsUploadingCompanionVideo(true);
        const uploadForm = new FormData();
        uploadForm.append("file", companionVideoFile);
        uploadForm.append("type", "video");

        const upRes = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "x-zovik-admin-request": "1" },
          body: uploadForm,
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          finalVideoUrl = upData.url;
        }
      }

      if (companionAvatarMode === "upload" && companionAvatarFile) {
        setIsUploadingCompanionAvatar(true);
        const uploadForm = new FormData();
        uploadForm.append("file", companionAvatarFile);
        uploadForm.append("type", "image");

        const upRes = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "x-zovik-admin-request": "1" },
          body: uploadForm,
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          finalImageUrl = upData.url;
          setAvailableImages((prev) => [finalImageUrl, ...prev.filter((img) => img !== finalImageUrl)]);
        }
      }

      const res = await fetch("/api/admin/characters", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          age: Number(formData.age) || 21,
          image: finalImageUrl,
          videoUrl: finalVideoUrl,
          isVipOnly: formData.accessTier === "vip",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCharacters((prev) => [data.character, ...prev]);
        setIsAddModalOpen(false);
        setCompanionAvatarFile(null);
        setCompanionAvatarPreview(null);
        setCompanionVideoFile(null);
        setFormData({
          name: "",
          age: 21,
          gender: "female",
          style: "realistic",
          category: "Trending",
          badge: "NEW",
          tagline: "",
          desc: "",
          voice: "Warm Whisper",
          tags: "Flirty, Sassy, Model",
          greeting: "Hey there! So excited to chat with you 💕",
          image: availableImages[0] || "/characters/zovik_01.jpg",
          accessTier: "free",
          videoUrl: "",
        });
        alert("Companion published successfully! 🚀");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to create companion");
      }
    } catch {
      alert("Error saving companion");
    } finally {
      setIsUploadingCompanionVideo(false);
      setIsUploadingCompanionAvatar(false);
    }
  };

  const handleUpdateCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.id) return;
    setIsSavingCompanionEdit(true);

    try {
      let finalVideoUrl = editFormData.videoUrl;
      let finalImageUrl = editFormData.image;

      if (editVideoMode === "upload" && editVideoFile) {
        setIsUploadingEditVideo(true);
        const uploadForm = new FormData();
        uploadForm.append("file", editVideoFile);
        uploadForm.append("type", "video");

        const upRes = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "x-zovik-admin-request": "1" },
          body: uploadForm,
        });

        if (!upRes.ok) throw new Error("Failed to upload intro video file");
        const upData = await upRes.json();
        finalVideoUrl = upData.url;
      }

      if (editAvatarMode === "upload" && editAvatarFile) {
        setIsUploadingEditAvatar(true);
        const uploadForm = new FormData();
        uploadForm.append("file", editAvatarFile);
        uploadForm.append("type", "image");

        const upRes = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "x-zovik-admin-request": "1" },
          body: uploadForm,
        });

        if (!upRes.ok) throw new Error("Failed to upload avatar image file");
        const upData = await upRes.json();
        finalImageUrl = upData.url;
        setAvailableImages((prev) => [finalImageUrl, ...prev.filter((img) => img !== finalImageUrl)]);
      }

      const res = await fetch("/api/admin/characters", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...editFormData,
          age: Number(editFormData.age) || 21,
          image: finalImageUrl,
          videoUrl: finalVideoUrl,
          isVipOnly: editFormData.accessTier === "vip",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCharacters((prev) =>
          prev.map((c) => (c.id === editFormData.id ? { ...c, ...data.character } : c))
        );
        setIsEditModalOpen(false);
        setEditingCompanion(null);
        setEditAvatarFile(null);
        setEditAvatarPreview(null);
        setEditVideoFile(null);
        alert("Companion updated successfully! ✨");
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to update companion");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating companion";
      alert(msg);
    } finally {
      setIsSavingCompanionEdit(false);
      setIsUploadingEditVideo(false);
      setIsUploadingEditAvatar(false);
    }
  };

  const handleDeleteCompanion = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this companion? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/characters?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setCharacters((prev) => prev.filter((c) => c.id !== id));
        alert("Companion permanently deleted from system.");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete companion");
      }
    } catch {
      alert("Error deleting companion");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
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

      {/* Companions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((char) => {
          const isVipTier = char.accessTier === "vip" || char.accessTier === "plus" || char.isVipOnly === true;
          return (
            <div
              key={char.id}
              className="flex items-center space-x-3 p-3.5 rounded-2xl bg-[#140b1c] border border-white/5 hover:border-white/15 transition-all shadow-sm"
            >
              <div className="relative size-14 rounded-xl overflow-hidden shrink-0 bg-black">
                <Image
                  src={getSafeImageUrl(char.image)}
                  alt={char.name}
                  fill
                  className="object-cover"
                  unoptimized
                  referrerPolicy="no-referrer"
                />
                {isVipTier && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-black text-[9px] font-black uppercase shadow-sm">
                    VIP
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-sm text-white truncate">{char.name}</span>
                  <span className="text-xs text-[#aeaeae]">• {char.age}</span>
                  {isVipTier && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                      👑 Plus & VIP
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#cbb6bf] line-clamp-1">{char.tagline}</span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-[10px] text-[#f53b70] font-bold">{char.category}</span>
                  {char.videoUrl && (
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center space-x-0.5" title={char.videoUrl}>
                      <Video className="size-2.5" />
                      <span>Intro Video</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={() => onManageGallery(char.id)}
                  className="px-2 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-[#f53b70] text-[11px] font-bold flex items-center space-x-1 transition-all"
                  title="Manage sequential photos"
                >
                  <Camera className="size-3" />
                  <span>Photos ({char.gallery?.length || 1})</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(char)}
                  className="size-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-colors"
                  title="Edit Companion details & Intro Video"
                >
                  <Edit3 className="size-4" />
                </button>
                <button
                  onClick={() => handleDeleteCompanion(char.id)}
                  className="size-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                  title="Delete Companion Permanently"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= 1. PUBLISH NEW COMPANION MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#170e20] border border-white/10 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-black flex items-center space-x-2">
                  <Sparkles className="size-5 text-[#f53b70]" />
                  <span>Publish New Companion</span>
                </h3>
                <p className="text-[11px] text-[#aeaeae]">Configure profile, access tiers, and introductory video.</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/60 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveCompanion} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Companion Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mia Khalifa, Natasha, or Custom AI"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value, 10) || 21 })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Trending, Hot, Roleplay, Anime"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  />
                </div>
              </div>

              {/* Access Tier Selector */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
                <label className="text-white font-bold flex items-center space-x-1.5">
                  <Crown className="size-4 text-amber-400" />
                  <span>Access Tier (Lock Control)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accessTier: "free" })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border transition-all ${
                      formData.accessTier === "free"
                        ? "bg-white/15 border-white/40 text-white shadow-sm"
                        : "bg-black/30 border-white/5 text-[#888] hover:text-white"
                    }`}
                  >
                    <span>Free for All Users</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accessTier: "vip" })}
                    className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center space-x-1.5 border transition-all ${
                      formData.accessTier === "vip"
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-black/30 border-white/5 text-[#888] hover:text-white"
                    }`}
                  >
                    <Crown className="size-3.5 fill-current" />
                    <span>Plus & VIP Only 👑</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. Sweet college sweetheart who loves romantic walks"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                />
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Personality & Backstory</label>
                <textarea
                  rows={2}
                  value={formData.desc}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  placeholder="Detailed personality description for AI prompt..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                />
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Flirty, Sweet, College, Roleplay"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                />
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="text-[#aeaeae] block mb-1.5 font-bold">Companion Avatar Image</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 mb-2">
                  <button
                    type="button"
                    onClick={() => setCompanionAvatarMode("upload")}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1 ${
                      companionAvatarMode === "upload" ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white" : "text-[#aeaeae]"
                    }`}
                  >
                    <UploadCloud className="size-3" />
                    <span>Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCompanionAvatarMode("url");
                      setCompanionAvatarFile(null);
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1 ${
                      companionAvatarMode === "url" ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white" : "text-[#aeaeae]"
                    }`}
                  >
                    <Globe className="size-3" />
                    <span>URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCompanionAvatarMode("preset");
                      setCompanionAvatarFile(null);
                      if (!formData.image || formData.image.startsWith("blob:")) {
                        setFormData({ ...formData, image: availableImages[0] || "/characters/zovik_01.jpg" });
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1 ${
                      companionAvatarMode === "preset" ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white" : "text-[#aeaeae]"
                    }`}
                  >
                    <ImageIcon className="size-3" />
                    <span>Preset</span>
                  </button>
                </div>

                {companionAvatarMode === "upload" && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setCompanionAvatarFile(file);
                      if (file) setCompanionAvatarPreview(URL.createObjectURL(file));
                    }}
                    className="w-full text-xs text-[#aeaeae] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#f53b70] file:text-white"
                  />
                )}
                {companionAvatarMode === "url" && (
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-[11px]"
                  />
                )}
                {companionAvatarMode === "preset" && (
                  <select
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  >
                    {availableImages.map((img) => (
                      <option key={img} value={img}>{img}</option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="submit"
                disabled={isUploadingCompanionVideo || isUploadingCompanionAvatar}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white font-extrabold text-xs shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 mt-2"
              >
                {isUploadingCompanionVideo || isUploadingCompanionAvatar ? "Uploading & Publishing..." : "Publish Companion to App 🚀"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= 2. EDIT COMPANION MODAL ================= */}
      {isEditModalOpen && editingCompanion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#170e20] border border-blue-500/30 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="relative size-10 rounded-xl overflow-hidden bg-black shrink-0 border border-blue-400/40">
                  <Image src={getSafeImageUrl(editFormData.image)} alt={editFormData.name} fill className="object-cover" unoptimized referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-base font-black flex items-center space-x-1.5">
                    <Edit3 className="size-4 text-blue-400" />
                    <span>Edit Companion: {editFormData.name}</span>
                  </h3>
                  <span className="text-[11px] text-[#aeaeae]">Update profile, intro video, or VIP access tier</span>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white/60 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateCompanion} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Companion Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Age</label>
                  <input
                    type="number"
                    value={editFormData.age}
                    onChange={(e) => setEditFormData({ ...editFormData, age: parseInt(e.target.value, 10) || 21 })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[#aeaeae] block mb-1 font-bold">Category</label>
                  <input
                    type="text"
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Access Tier Selector */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
                <label className="text-white font-bold flex items-center space-x-1.5">
                  <Crown className="size-4 text-amber-400" />
                  <span>Access Tier (Lock Control)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, accessTier: "free" })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border transition-all ${
                      editFormData.accessTier === "free"
                        ? "bg-white/15 border-white/40 text-white shadow-sm"
                        : "bg-black/30 border-white/5 text-[#888] hover:text-white"
                    }`}
                  >
                    <span>Free for All Users</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, accessTier: "vip" })}
                    className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center space-x-1.5 border transition-all ${
                      editFormData.accessTier === "vip"
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-black/30 border-white/5 text-[#888] hover:text-white"
                    }`}
                  >
                    <Crown className="size-3.5 fill-current" />
                    <span>Plus & VIP Only 👑</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Tagline</label>
                <input
                  type="text"
                  value={editFormData.tagline}
                  onChange={(e) => setEditFormData({ ...editFormData, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Personality Description</label>
                <textarea
                  rows={2}
                  value={editFormData.desc}
                  onChange={(e) => setEditFormData({ ...editFormData, desc: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[#aeaeae] block mb-1 font-bold">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editFormData.tags}
                  onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-blue-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingCompanionEdit || isUploadingEditVideo || isUploadingEditAvatar}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-extrabold text-xs shadow-lg hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 mt-2"
              >
                {isSavingCompanionEdit ? "Saving Changes..." : "Save Companion Changes ✨"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
