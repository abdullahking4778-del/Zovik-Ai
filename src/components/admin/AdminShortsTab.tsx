"use client";

import React, { useState } from "react";
import { Plus, Globe, UploadCloud, Film } from "lucide-react";
import { ShortReel } from "@/types";
import { getSafeStreamUrl } from "@/lib/videoHelper";

interface AdminShortsTabProps {
  shorts: ShortReel[];
  setShorts: React.Dispatch<React.SetStateAction<ShortReel[]>>;
  getAuthHeaders: () => Record<string, string>;
  onRefreshData: () => void;
}

export function AdminShortsTab({
  shorts,
  setShorts,
  getAuthHeaders,
  onRefreshData,
}: AdminShortsTabProps) {
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [reelVideoMode, setReelVideoMode] = useState<"url" | "upload" | "preset">("url");
  const [reelUploadFile, setReelUploadFile] = useState<File | null>(null);
  const [isUploadingReel, setIsUploadingReel] = useState(false);
  const [reelData, setReelData] = useState({
    characterName: "",
    videoUrl: "",
    caption: "",
    avatar: "/characters/zovik_01.jpg",
  });

  const handleDeleteReel = async (id: string) => {
    if (!confirm("Are you sure you want to delete this short reel?")) return;
    try {
      const res = await fetch(`/api/admin/shorts?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setShorts(shorts.filter((s) => s.id !== id));
      } else {
        alert("Failed to delete reel");
      }
    } catch {
      alert("Error deleting reel");
    }
  };

  const handleSaveReel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploadingReel(true);

    try {
      let finalVideoUrl = reelData.videoUrl.trim();

      if (reelVideoMode === "upload" && reelUploadFile) {
        const token = localStorage.getItem("zovik_admin_session") || "";
        const uploadForm = new FormData();
        uploadForm.append("file", reelUploadFile);
        uploadForm.append("type", "video");

        const upRes = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: uploadForm,
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          finalVideoUrl = upData.url;
        } else {
          alert("Failed to upload video reel");
          setIsUploadingReel(false);
          return;
        }
      }

      if (!finalVideoUrl) {
        alert("Please provide a video URL or upload a video file!");
        setIsUploadingReel(false);
        return;
      }

      const res = await fetch("/api/admin/shorts", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...reelData,
          videoUrl: finalVideoUrl,
        }),
      });

      if (res.ok) {
        setIsAddReelOpen(false);
        setReelData({
          characterName: "",
          videoUrl: "",
          caption: "",
          avatar: "/characters/zovik_01.jpg",
        });
        setReelUploadFile(null);
        onRefreshData();
      } else {
        alert("Failed to save reel");
      }
    } catch {
      alert("Error saving reel");
    } finally {
      setIsUploadingReel(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
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
                src={getSafeStreamUrl(reel.videoUrl)}
                poster={reel.avatar}
                autoPlay
                muted
                loop
                playsInline
                controlsList="nodownload nofullscreen noremoteplayback"
                disablePictureInPicture
                className="size-full object-cover"
              />
            </div>

            <div>
              <h4 className="font-black text-white text-sm">{reel.characterName}</h4>
              <p className="text-xs text-[#aeaeae] line-clamp-2">{reel.caption}</p>
              <span className="text-[10px] text-white/40 block mt-1 font-mono truncate">
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

      {/* Add Reel Modal */}
      {isAddReelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#170e20] border border-white/10 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-black">Add Short Reel</h3>
              <button onClick={() => setIsAddReelOpen(false)} className="text-[#888] hover:text-white">✕</button>
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#f53b70]"
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                />
              </div>

              {/* Mode Selector */}
              <div>
                <label className="text-[#aeaeae] block mb-1.5 font-bold text-xs">Video Source Mode</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setReelVideoMode("url");
                      setReelUploadFile(null);
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1 transition-all ${
                      reelVideoMode === "url"
                        ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white shadow-md"
                        : "text-[#aeaeae] hover:text-white"
                    }`}
                  >
                    <Globe className="size-3.5 shrink-0" />
                    <span>External URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReelVideoMode("upload")}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1 transition-all ${
                      reelVideoMode === "upload"
                        ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white shadow-md"
                        : "text-[#aeaeae] hover:text-white"
                    }`}
                  >
                    <UploadCloud className="size-3.5 shrink-0" />
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReelVideoMode("preset");
                      setReelUploadFile(null);
                      if (!reelData.videoUrl || reelData.videoUrl.startsWith("http")) {
                        setReelData({ ...reelData, videoUrl: "/videos/companions/aria-solis.mp4" });
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1 transition-all ${
                      reelVideoMode === "preset"
                        ? "bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white shadow-md"
                        : "text-[#aeaeae] hover:text-white"
                    }`}
                  >
                    <Film className="size-3.5 shrink-0" />
                    <span>Preset Video</span>
                  </button>
                </div>
              </div>

              {reelVideoMode === "url" && (
                <div>
                  <input
                    type="url"
                    value={reelData.videoUrl}
                    onChange={(e) => setReelData({ ...reelData, videoUrl: e.target.value })}
                    placeholder="https://example.com/video.mp4"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-[11px] outline-none focus:border-[#f53b70]"
                  />
                </div>
              )}

              {reelVideoMode === "upload" && (
                <div>
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(e) => setReelUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[#aeaeae] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#f53b70] file:text-white hover:file:brightness-110"
                  />
                </div>
              )}

              {reelVideoMode === "preset" && (
                <div>
                  <select
                    value={reelData.videoUrl}
                    onChange={(e) => setReelData({ ...reelData, videoUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#f53b70]"
                  >
                    <option value="/videos/companions/aria-solis.mp4">Aria Solis (Intro)</option>
                    <option value="/videos/companions/elena-santorini.mp4">Elena Santorini (Intro)</option>
                    <option value="/videos/companions/maya-cruz.mp4">Maya Cruz (Intro)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploadingReel}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white font-bold text-xs shadow-md hover:brightness-110 transition-all disabled:opacity-50"
              >
                {isUploadingReel ? "Uploading..." : "Save Reel"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
