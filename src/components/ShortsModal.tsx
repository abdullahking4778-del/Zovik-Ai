"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { X, Heart, Volume2, VolumeX, ChevronDown, ChevronUp, Share2, Sparkles, Check } from "lucide-react";
import { Character } from "@/types";
import { getSafeStreamUrl, fetchVideoBlobUrl } from "@/lib/videoHelper";

export interface ReelItem {
  id: string;
  characterId: string;
  characterName: string;
  characterAge?: number;
  avatar?: string;
  videoUrl: string;
  caption: string;
  tags?: string[];
}

interface ShortsModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  onStartChat?: (char: Character) => void;
  initialReelId?: string | null;
}

export default function ShortsModal({
  isOpen,
  onClose,
  characters,
  initialReelId,
}: ShortsModalProps) {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<{ [key: string]: boolean }>({});
  // Audio auto-ON by default
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string>("");
  const [shareCopied, setShareCopied] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrollLockRef = useRef<boolean>(false);
  const touchStartYRef = useRef<number | null>(null);

  // Fetch real local reels from /api/shorts
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/shorts")
      .then((res) => res.json())
      .then((data) => {
        let loadedReels: ReelItem[] = [];
        if (data.shorts && Array.isArray(data.shorts) && data.shorts.length > 0) {
          loadedReels = data.shorts;
        } else {
          // Dynamic fallback from companions with videos
          loadedReels = characters
            .filter((c) => c.videoUrl)
            .map((c, idx) => ({
              id: `short-${idx + 1}`,
              characterId: c.id,
              characterName: c.name,
              characterAge: c.age || 22,
              avatar: "/logos/zovik-squircle.svg",
              videoUrl: c.videoUrl!,
              caption: c.tagline ? `${c.tagline} 💕` : "Welcome to Zovik AI Shorts 💕",
              tags: c.tags || ["Trending", "VIP"],
            }));
        }
        setReels(loadedReels);

        // Deep-link initial reel positioning
        if (initialReelId && loadedReels.length > 0) {
          const matchIndex = loadedReels.findIndex(
            (r) =>
              r.id === initialReelId ||
              r.characterId === initialReelId ||
              r.characterName.toLowerCase() === initialReelId.toLowerCase()
          );
          if (matchIndex !== -1) {
            setCurrentIndex(matchIndex);
          }
        }
      })
      .catch(() => {
        const loadedReels = characters
          .filter((c) => c.videoUrl)
          .map((c, idx) => ({
            id: `short-${idx + 1}`,
            characterId: c.id,
            characterName: c.name,
            characterAge: c.age || 22,
            avatar: "/logos/zovik-squircle.svg",
            videoUrl: c.videoUrl!,
            caption: c.tagline ? `${c.tagline} 💕` : "Welcome to Zovik AI Shorts 💕",
            tags: c.tags || ["Trending", "VIP"],
          }));
        setReels(loadedReels);
      });
  }, [isOpen, characters, initialReelId]);

  // Video autoplay management with Sound ON by default
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    
    // Attempt play with audio
    videoRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        // Strict browser unmuted autoplay fallback: mute first to guarantee playback, then unmute on user tap
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
  }, [currentIndex, reels]);

  const currentReel = reels[currentIndex];

  // Dynamic Blob & Stream URL generation to prevent IDM download popups
  useEffect(() => {
    if (!currentReel?.videoUrl) return;
    let isMounted = true;
    setActiveVideoSrc(getSafeStreamUrl(currentReel.videoUrl));

    fetchVideoBlobUrl(currentReel.videoUrl).then((blobUrl) => {
      if (isMounted && blobUrl) {
        setActiveVideoSrc(blobUrl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentReel?.videoUrl]);

  const handleNext = useCallback(() => {
    if (reels.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % reels.length);
  }, [reels.length]);

  const handlePrev = useCallback(() => {
    if (reels.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? reels.length - 1 : prev - 1));
  }, [reels.length]);

  // Mouse Wheel Scrolling for PC with debounce lock
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollLockRef.current) return;
    if (Math.abs(e.deltaY) < 30) return;

    scrollLockRef.current = true;
    if (e.deltaY > 0) {
      handleNext();
    } else {
      handlePrev();
    }
    setTimeout(() => {
      scrollLockRef.current = false;
    }, 400);
  };

  // Mobile Touch Swipe Handling
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const diff = touchStartYRef.current - endY;
    touchStartYRef.current = null;

    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        handleNext(); // Swiped Up -> Next
      } else {
        handlePrev(); // Swiped Down -> Previous
      }
    }
  };

  const toggleLike = () => {
    if (!currentReel) return;
    setLiked((prev) => ({ ...prev, [currentReel.id]: !prev[currentReel.id] }));
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleShare = () => {
    if (!currentReel) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/?reel=${encodeURIComponent(currentReel.id)}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  if (!isOpen || reels.length === 0 || !currentReel) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn select-none"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close Button Top Right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-40 size-11 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-xl"
        title="Close Shorts"
      >
        <X className="size-5" />
      </button>

      {/* Main Vertical Reel Phone Player Container */}
      <div className="relative flex flex-col w-full h-full md:max-w-md md:h-[92vh] bg-black md:rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Video Player */}
        <div className="relative inset-0 size-full cursor-pointer" onClick={togglePlay}>
          <video
            ref={videoRef}
            src={activeVideoSrc || (currentReel ? getSafeStreamUrl(currentReel.videoUrl) : "")}
            poster={currentReel.avatar || "/logos/zovik-squircle.svg"}
            autoPlay
            muted={isMuted}
            loop
            playsInline
            controls={false}
            className="size-full object-cover"
          />

          {/* Pause Indicator overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="size-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 scale-110 animate-pulse">
                <span className="text-xl">▶</span>
              </div>
            </div>
          )}
        </div>

        {/* Top Header Overlay: Brand Badge & Audio Auto-ON Toggle */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-xs font-black shadow-lg">
            <Sparkles className="size-3.5 text-[#f53b70]" />
            <span className="tracking-wide">ZOVIK REELS</span>
          </div>

          {/* Sound Toggle (Default Sound ON) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (videoRef.current) {
                videoRef.current.muted = nextMuted;
              }
            }}
            className={`size-10 rounded-full backdrop-blur-md border flex items-center justify-center text-white transition-all active:scale-95 shadow-lg ${
              isMuted
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "bg-black/60 border-white/20 hover:bg-black/80 text-white"
            }`}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>

        {/* Right Floating Actions Column */}
        <div className="absolute right-3.5 bottom-24 z-30 flex flex-col items-center space-y-4">
          {/* Up & Down Scroll Arrows */}
          <div className="flex flex-col space-y-1.5 mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              title="Previous Video (Scroll Up)"
              className="size-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all active:scale-90"
            >
              <ChevronUp className="size-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              title="Next Video (Scroll Down)"
              className="size-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all active:scale-90"
            >
              <ChevronDown className="size-5" />
            </button>
          </div>

          {/* Interactive Heart Button (Cleaned: No Fake Numbers) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike();
            }}
            className="flex flex-col items-center space-y-1 group"
            title="Like this reel"
          >
            <div
              className={`size-12 rounded-full backdrop-blur-md flex items-center justify-center border transition-all ${
                liked[currentReel.id]
                  ? "bg-[#f53b70] border-[#f53b70] text-white shadow-lg shadow-pink-600/50 scale-110"
                  : "bg-black/60 border-white/15 text-white group-hover:scale-105"
              }`}
            >
              <Heart className={`size-5 transition-transform ${liked[currentReel.id] ? "fill-white scale-110" : ""}`} />
            </div>
            <span className="text-[10px] font-bold text-white shadow-black drop-shadow tracking-wider">
              {liked[currentReel.id] ? "Liked" : "Like"}
            </span>
          </button>

          {/* Share Button (Deep-link copy) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="flex flex-col items-center space-y-1 group"
            title="Share Reel Link"
          >
            <div className="size-12 rounded-full bg-black/60 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all group-hover:scale-105 active:scale-90">
              {shareCopied ? <Check className="size-5 text-emerald-400" /> : <Share2 className="size-5" />}
            </div>
            <span className="text-[10px] font-bold text-white shadow-black drop-shadow tracking-wider">
              {shareCopied ? "Copied!" : "Share"}
            </span>
          </button>
        </div>

        {/* Bottom Official Brand Identity & Caption (No Chat Button / Distraction Free) */}
        <div className="absolute inset-x-0 bottom-0 z-30 p-5 bg-gradient-to-t from-black via-black/70 to-transparent flex flex-col space-y-2">
          {/* Profile Identity with Official Zovik Squircle Emblem */}
          <div className="flex items-center space-x-3">
            <div className="relative size-12 rounded-2xl overflow-hidden border-2 border-[#f53b70] shadow-lg shadow-pink-600/40 shrink-0 bg-[#12081a]">
              <Image
                src="/logos/zovik-squircle.svg"
                alt="Zovik AI"
                fill
                className="object-cover p-1"
                unoptimized
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="text-base font-extrabold text-white truncate">
                  {currentReel.characterName}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                  OFFICIAL REEL
                </span>
              </div>
              <p className="text-xs text-[#e2d5dc] line-clamp-2 mt-0.5 leading-relaxed">
                {currentReel.caption}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
