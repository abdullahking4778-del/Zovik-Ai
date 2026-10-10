"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  UploadCloud,
  Trash2,
  RefreshCw,
  Plus,
  Check,
  Globe,
  ImageIcon,
  ArrowLeft,
  ArrowRight,
  Star,
  SlidersHorizontal,
  FolderArchive,
  GripVertical,
} from "lucide-react";
import { Character } from "@/types";
import { getSafeImageUrl } from "@/lib/imageHelper";

interface AdminGalleriesTabProps {
  characters: Character[];
  selectedGalleryCharId: string;
  setSelectedGalleryCharId: (id: string) => void;
  workingGallery: string[];
  setWorkingGallery: React.Dispatch<React.SetStateAction<string[]>>;
  availableImages: string[];
  setAvailableImages: React.Dispatch<React.SetStateAction<string[]>>;
  getAuthHeaders: () => Record<string, string>;
  onSaveSuccess: () => void;
}

export function AdminGalleriesTab({
  characters,
  selectedGalleryCharId,
  setSelectedGalleryCharId,
  workingGallery,
  setWorkingGallery,
  availableImages,
  setAvailableImages,
  getAuthHeaders,
  onSaveSuccess,
}: AdminGalleriesTabProps) {
  const [savingGallery, setSavingGallery] = useState(false);
  const [galleryAddMode, setGalleryAddMode] = useState<"upload" | "url" | "preset">("url");
  const [newGalleryPhotoUrl, setNewGalleryPhotoUrl] = useState("");
  const [galleryAddFile, setGalleryAddFile] = useState<File | null>(null);
  const [isUploadingGalleryAdd, setIsUploadingGalleryAdd] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [galleryUploadStatus, setGalleryUploadStatus] = useState<string | null>(null);

  // Re-ordering & Insertion States (Drag & Drop + Custom Position Number)
  const [insertPosition, setInsertPosition] = useState<number | "end">("end");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const currentCompanion =
    characters.find((c) => c.id === selectedGalleryCharId) || characters[0];

  const handleSelectChar = (id: string) => {
    setSelectedGalleryCharId(id);
    const target = characters.find((c) => c.id === id);
    if (target) {
      setWorkingGallery(
        target.gallery && target.gallery.length > 0 ? target.gallery : [target.image]
      );
    }
  };

  // ========================================================
  // RE-ORDERING FUNCTIONS (Drag & Drop + Dropdown Index)
  // ========================================================

  /**
   * Move a photo from currentIndex to targetIndex
   */
  const handleMovePhoto = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= workingGallery.length || fromIndex === toIndex) return;
    const updated = [...workingGallery];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    setWorkingGallery(updated);
  };

  /**
   * Move 1 step left (earlier in queue)
   */
  const handleMoveLeft = (idx: number) => {
    handleMovePhoto(idx, idx - 1);
  };

  /**
   * Move 1 step right (later in queue)
   */
  const handleMoveRight = (idx: number) => {
    handleMovePhoto(idx, idx + 1);
  };

  /**
   * Directly set as primary / #1 default avatar
   */
  const handleSetAsPrimary = (idx: number) => {
    if (idx === 0) return;
    handleMovePhoto(idx, 0);
  };

  /**
   * Set specific 1-based position from dropdown (1, 2, 3...)
   */
  const handleSetPosition = (fromIdx: number, targetPosition1Based: number) => {
    const targetIdx = targetPosition1Based - 1;
    handleMovePhoto(fromIdx, targetIdx);
  };

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    handleMovePhoto(draggedIdx, targetIndex);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleRemovePhoto = (idx: number) => {
    if (workingGallery.length <= 1) {
      alert("A companion must have at least 1 photo in their gallery!");
      return;
    }
    setWorkingGallery(workingGallery.filter((_, i) => i !== idx));
  };

  const handleAddSinglePhoto = async () => {
    let finalPhotoUrl = newGalleryPhotoUrl.trim();

    if (galleryAddMode === "upload" && galleryAddFile) {
      setIsUploadingGalleryAdd(true);
      try {
        const uploadForm = new FormData();
        uploadForm.append("file", galleryAddFile);
        uploadForm.append("type", "image");

        const upRes = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "x-zovik-admin-request": "1" },
          body: uploadForm,
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          finalPhotoUrl = upData.url;
          setAvailableImages((prev) => [
            finalPhotoUrl,
            ...prev.filter((img) => img !== finalPhotoUrl),
          ]);
        } else {
          alert("Failed to upload photo");
          setIsUploadingGalleryAdd(false);
          return;
        }
      } catch {
        alert("Error uploading photo");
        setIsUploadingGalleryAdd(false);
        return;
      }
      setIsUploadingGalleryAdd(false);
    }

    if (!finalPhotoUrl) return;
    if (workingGallery.includes(finalPhotoUrl)) {
      alert("This photo is already in the gallery!");
      return;
    }

    // Insert at chosen position (beginning #1, specific index, or end)
    const updated = [...workingGallery];
    if (insertPosition === "end" || insertPosition > updated.length) {
      updated.push(finalPhotoUrl);
    } else {
      const targetPos = Math.max(0, insertPosition - 1);
      updated.splice(targetPos, 0, finalPhotoUrl);
    }

    setWorkingGallery(updated);
    setNewGalleryPhotoUrl("");
    setGalleryAddFile(null);
    setInsertPosition("end");
  };

  const handleUploadGalleryPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingGallery(true);
    setGalleryUploadStatus("Compressing and uploading images...");

    try {
      const newUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", "image");

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "x-zovik-admin-request": "1" },
          body: fd,
        });

        if (res.ok) {
          const data = await res.json();
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
        setWorkingGallery((prev) => [
          ...prev,
          ...newUrls.filter((u) => !prev.includes(u)),
        ]);
        setAvailableImages((prev) => [
          ...newUrls,
          ...prev.filter((img) => !newUrls.includes(img)),
        ]);
        setGalleryUploadStatus(`✓ Added ${newUrls.length} photos to sequence! Remember to click Save.`);
      } else {
        setGalleryUploadStatus("No valid photos extracted.");
      }
    } catch {
      alert("Error uploading gallery photos");
      setGalleryUploadStatus(null);
    } finally {
      setIsUploadingGallery(false);
    }
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
          // First picture is always set as the companion's main avatar/image
          image: workingGallery[0],
        }),
      });
      if (res.ok) {
        alert("Companion photo sequence successfully saved! First photo set as main avatar. 📸");
        onSaveSuccess();
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

  return (
    <div className="space-y-6">
      {/* Top Header & Save Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <SlidersHorizontal className="size-5 text-[#f53b70]" />
            <span>Companion Gallery Sequence & Re-Ordering</span>
          </h2>
          <p className="text-xs text-[#aeaeae] mt-0.5">
            Decide exactly which photo comes at position 1, 2, 3, etc. Photo #1 is automatically used as the main companion avatar.
          </p>
        </div>

        <button
          onClick={handleSaveGallery}
          disabled={savingGallery || workingGallery.length === 0}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white text-xs font-black shadow-lg shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
        >
          <Check className="size-4" />
          <span>{savingGallery ? "Saving Sequence..." : "Save Gallery Sequence"}</span>
        </button>
      </div>

      {/* Companion Selector Card */}
      <div className="p-4 rounded-3xl bg-[#140b1c] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="relative size-16 rounded-2xl overflow-hidden bg-black shrink-0 border-2 border-[#f53b70]/40 shadow-lg">
            <Image
              src={getSafeImageUrl(currentCompanion?.image || "/characters/zovik_01.jpg")}
              alt={currentCompanion?.name || ""}
              fill
              className="object-cover"
              unoptimized
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-base text-white">{currentCompanion?.name}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-400 text-[10px] font-black uppercase">
                {workingGallery.length} Photos in Sequence
              </span>
            </div>
            <span className="text-xs text-[#aeaeae]">
              {currentCompanion?.tagline || currentCompanion?.category} • {currentCompanion?.gender}
            </span>
          </div>
        </div>

        <div className="w-full md:w-auto flex items-center space-x-2">
          <label className="text-xs font-bold text-[#aeaeae] whitespace-nowrap">Select Companion:</label>
          <select
            value={selectedGalleryCharId}
            onChange={(e) => handleSelectChar(e.target.value)}
            className="flex-1 md:w-64 px-3 py-2 rounded-xl bg-[#1d0f26] border border-white/10 text-white text-xs font-bold outline-none focus:border-[#f53b70]"
          >
            {characters.map((c) => {
              const isVipTier = c.accessTier === "vip" || c.accessTier === "plus" || c.isVipOnly === true;
              return (
                <option key={c.id} value={c.id}>
                  {c.name} {isVipTier ? "👑 [VIP]" : ""} ({c.gallery?.length || 1} photos)
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PHOTO SEQUENCE GRID WITH NUMBER SELECTOR & MOVE ARROWS */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-white tracking-wider uppercase flex items-center space-x-1.5">
            <span>Delivery Order (Sequential Delivery)</span>
          </span>
          <span className="text-[11px] text-[#aeaeae]">
            Use arrows or select position number to re-order. Photo #1 is the main avatar!
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {workingGallery.map((photoUrl, idx) => (
            <div
              key={`${photoUrl}-${idx}`}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`group relative rounded-2xl bg-[#140b1c] border overflow-hidden flex flex-col shadow-md transition-all cursor-grab active:cursor-grabbing ${
                dragOverIdx === idx
                  ? "ring-2 ring-[#f53b70] border-[#f53b70] scale-[1.03] shadow-xl z-20"
                  : idx === 0
                  ? "border-amber-400/80 shadow-amber-500/20 shadow-lg"
                  : "border-white/10 hover:border-pink-500/50"
              }`}
            >
              {/* Photo Preview Container */}
              <div className="relative aspect-[3/4] w-full bg-black select-none">
                <Image
                  src={getSafeImageUrl(photoUrl)}
                  alt={`Photo #${idx + 1}`}
                  fill
                  className="object-cover pointer-events-none"
                  unoptimized
                  referrerPolicy="no-referrer"
                />

                {/* Primary Photo Badge */}
                <div
                  className={`absolute top-2 left-2 z-10 px-2.5 py-1 rounded-full backdrop-blur-md text-[10px] font-black shadow-md flex items-center space-x-1 ${
                    idx === 0
                      ? "bg-amber-500 text-black border border-amber-300"
                      : "bg-black/75 text-pink-300 border border-pink-500/40"
                  }`}
                >
                  {idx === 0 && <Star className="size-3 fill-black text-black" />}
                  <span>#{idx + 1} {idx === 0 ? "Main Avatar" : `Delivery #${idx + 1}`}</span>
                </div>

                {/* Drag Handle Indicator */}
                <div
                  title="Drag and drop to re-order"
                  className="absolute top-2 right-10 z-10 size-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="size-3.5" />
                </div>

                {/* Remove Photo Button */}
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  disabled={workingGallery.length <= 1}
                  title={workingGallery.length <= 1 ? "Must keep at least 1 photo" : "Remove photo"}
                  className="absolute top-2 right-2 z-10 size-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden"
                >
                  <Trash2 className="size-3.5" />
                </button>

                {/* Make Primary (#1) Quick Button (if not already #1) */}
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetAsPrimary(idx)}
                    title="Set as #1 Primary Avatar"
                    className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-amber-500 hover:text-black border border-amber-400/50 text-amber-300 text-[10px] font-black flex items-center space-x-1 shadow-md opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Star className="size-3 fill-current" />
                    <span>Set as #1</span>
                  </button>
                )}
              </div>

              {/* RE-ORDERING CONTROLS FOOTER */}
              <div className="p-3 bg-[#1b1024] space-y-2 border-t border-white/5">
                {/* Position Select Dropdown */}
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <div className="flex items-center space-x-1 text-[#aeaeae] font-bold">
                    <GripVertical className="size-3 text-pink-400" />
                    <span>Order:</span>
                  </div>
                  <select
                    value={idx + 1}
                    onChange={(e) => handleSetPosition(idx, parseInt(e.target.value, 10))}
                    className="px-2 py-1 rounded-lg bg-black/60 border border-pink-500/30 text-pink-300 hover:border-pink-500 font-black text-xs outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer"
                  >
                    {workingGallery.map((_, pIdx) => (
                      <option key={pIdx} value={pIdx + 1}>
                        #{pIdx + 1} {pIdx === 0 ? "(Main Avatar ⭐)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Arrow Navigation (Move Left / Move Right) */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleMoveLeft(idx)}
                    disabled={idx === 0}
                    className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white text-[10px] font-bold flex items-center justify-center space-x-1 transition-colors"
                    title="Move Earlier in Queue (Left)"
                  >
                    <ArrowLeft className="size-3" />
                    <span>Earlier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveRight(idx)}
                    disabled={idx === workingGallery.length - 1}
                    className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white text-[10px] font-bold flex items-center justify-center space-x-1 transition-colors"
                    title="Move Later in Queue (Right)"
                  >
                    <span>Later</span>
                    <ArrowRight className="size-3" />
                  </button>
                </div>
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
            Auto-Compressed to WebP
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
              <FolderArchive className="size-6" />
            )}
          </div>
          <span className="text-xs font-bold text-white group-hover:text-[#f53b70] transition-colors">
            {isUploadingGallery
              ? "Compressing & Uploading Photos..."
              : "Click or Drag & Drop Photos or .ZIP from PC / Phone"}
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

      {/* Add Single Photo Card */}
      <div className="p-5 rounded-3xl bg-[#140b1c] border border-white/5 space-y-4">
        <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
          <Plus className="size-4 text-[#f53b70]" />
          <span>Add Next Photo to this Companion's Sequence</span>
        </h4>

        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 max-w-sm">
          <button
            type="button"
            onClick={() => setGalleryAddMode("upload")}
            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1 transition-all ${
              galleryAddMode === "upload"
                ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white shadow-md"
                : "text-[#aeaeae] hover:text-white"
            }`}
          >
            <UploadCloud className="size-3 shrink-0" />
            <span>Upload Device</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setGalleryAddMode("url");
              setGalleryAddFile(null);
            }}
            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1 transition-all ${
              galleryAddMode === "url"
                ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white shadow-md"
                : "text-[#aeaeae] hover:text-white"
            }`}
          >
            <Globe className="size-3 shrink-0" />
            <span>External URL</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setGalleryAddMode("preset");
              setGalleryAddFile(null);
              if (!newGalleryPhotoUrl) setNewGalleryPhotoUrl(availableImages[0] || "");
            }}
            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1 transition-all ${
              galleryAddMode === "preset"
                ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white shadow-md"
                : "text-[#aeaeae] hover:text-white"
            }`}
          >
            <ImageIcon className="size-3 shrink-0" />
            <span>Preset List</span>
          </button>
        </div>

        {/* Target Position Selection for New Photo */}
        <div className="flex flex-wrap items-center gap-3 text-xs bg-black/30 p-2.5 rounded-xl border border-white/5">
          <span className="text-[#aeaeae] font-bold flex items-center space-x-1.5">
            <SlidersHorizontal className="size-3.5 text-pink-400" />
            <span>Insert Photo at Position:</span>
          </span>
          <select
            value={insertPosition === "end" ? "end" : insertPosition}
            onChange={(e) => setInsertPosition(e.target.value === "end" ? "end" : parseInt(e.target.value, 10))}
            className="px-3 py-1.5 rounded-lg bg-black/80 border border-pink-500/30 text-pink-300 font-bold text-xs outline-none focus:border-[#f53b70] cursor-pointer"
          >
            <option value="end">At End of Sequence (Default)</option>
            <option value="1">#1 (Make New Main Avatar ⭐)</option>
            {workingGallery.map((_, i) => (
              i > 0 && <option key={i} value={i + 1}>Position #{i + 1}</option>
            ))}
          </select>
          <span className="text-[11px] text-[#8e8e8e]">
            {insertPosition === 1 ? "⚠️ This will become the companion's new main profile image." : ""}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {galleryAddMode === "upload" && (
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              onChange={(e) => setGalleryAddFile(e.target.files?.[0] || null)}
              className="flex-1 text-xs text-[#aeaeae] file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#f53b70] file:text-white hover:file:brightness-110"
            />
          )}

          {galleryAddMode === "url" && (
            <input
              type="url"
              value={newGalleryPhotoUrl}
              onChange={(e) => setNewGalleryPhotoUrl(e.target.value)}
              placeholder="Paste direct photo link (e.g. Catbox, Imgur, CDN)..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs outline-none focus:border-[#f53b70]"
            />
          )}

          {galleryAddMode === "preset" && (
            <select
              value={newGalleryPhotoUrl}
              onChange={(e) => setNewGalleryPhotoUrl(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-[#f53b70]"
            >
              {availableImages.map((img) => (
                <option key={img} value={img}>
                  {img}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleAddSinglePhoto}
            disabled={
              isUploadingGalleryAdd ||
              (galleryAddMode === "upload" && !galleryAddFile) ||
              (galleryAddMode !== "upload" && !newGalleryPhotoUrl.trim())
            }
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shrink-0"
          >
            {isUploadingGalleryAdd ? "Uploading..." : "Add to Sequence"}
          </button>
        </div>
      </div>
    </div>
  );
}
