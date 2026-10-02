"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Phone,
  Send,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Maximize2,
  Film,
  Lock,
  CheckCheck,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Crown,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { Character, Message } from "@/types";
import { getSafeStreamUrl, fetchVideoBlobUrl } from "@/lib/videoHelper";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface ChatModalProps {
  character: Character | null;
  onClose: () => void;
  onStartCall: (character: Character) => void;
  openPremiumModal: () => void;
}

function ChatVideoPlayer({
  src,
  poster,
  onExpand,
}: {
  src: string;
  poster?: string;
  onExpand?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string>(() => getSafeStreamUrl(src));

  useEffect(() => {
    let isMounted = true;
    fetchVideoBlobUrl(src).then((blobUrl) => {
      if (isMounted && blobUrl) {
        setVideoSrc(blobUrl);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [src]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <div
      onClick={togglePlay}
      className="relative w-full max-w-[260px] sm:max-w-[280px] aspect-[3/4] rounded-2xl overflow-hidden bg-black cursor-pointer group shadow-inner select-none border border-white/10"
    >
      <video
        ref={videoRef}
        src={videoSrc}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
      />

      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#f53b70]/40 text-[#ff759f] text-[10px] font-black uppercase tracking-wider shadow-md">
        <Sparkles className="size-3 text-[#f53b70]" />
        <span>Intro Video</span>
      </div>

      {onExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          title="Expand Video"
          className="absolute top-2.5 right-2.5 z-10 size-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md"
        >
          <Maximize2 className="size-3.5" />
        </button>
      )}

      {/* Center Paused Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
          <div className="size-12 rounded-full bg-[#f53b70]/90 text-white flex items-center justify-center shadow-lg shadow-pink-600/40">
            <Play className="size-6 ml-0.5" />
          </div>
        </div>
      )}

      {/* Bottom Floating Controls */}
      <div className="absolute bottom-2.5 inset-x-2.5 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="size-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all shadow-md"
          >
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
          </button>
        </div>

        <div className="pointer-events-auto">
          <button
            onClick={toggleMute}
            className="size-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all shadow-md"
          >
            {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5 text-emerald-400" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatModal({
  character,
  onClose,
  onStartCall,
  openPremiumModal,
}: ChatModalProps) {
  const { tier: authTier } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [playingVoiceIdx, setPlayingVoiceIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // User VIP/Plus Status and Daily Message Limit (Free: 20, Plus: 200, VIP: 500 / 24h)
  const [isVipUser, setIsVipUser] = useState(false);
  const [userTier, setUserTier] = useState<"free" | "plus" | "vip">("free");
  const [messagesRemaining, setMessagesRemaining] = useState(20);
  const [timeUntilReset, setTimeUntilReset] = useState("");

  // Check VIP status and calculate 24h message reset
  const [clearedNotice, setClearedNotice] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [highlightPhotoBtn, setHighlightPhotoBtn] = useState(false);
  const [isStreamingAiText, setIsStreamingAiText] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);

  useEffect(() => {
    const directTier = typeof window !== "undefined" ? localStorage.getItem("zovik_tier") : null;
    const directVip = typeof window !== "undefined" ? localStorage.getItem("zovik_is_vip") : null;
    
    let tier: "free" | "plus" | "vip" = "free";
    if (authTier === "vip" || directTier === "vip" || directVip === "true") {
      tier = "vip";
    } else if (authTier === "plus" || directTier === "plus") {
      tier = "plus";
    }

    const savedUser = typeof window !== "undefined" ? localStorage.getItem("zovik_user") : null;
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.tier === "vip") tier = "vip";
        else if (u.tier === "plus") tier = "plus";
        else if (u.isVip) tier = "vip";
      } catch {}
    }

    setUserTier(tier);
    const isSubscriber = tier === "vip" || tier === "plus";
    setIsVipUser(isSubscriber);

    // Quotas: Free: 20, Plus: 200, VIP: 500
    const dailyQuota = tier === "vip" ? 500 : tier === "plus" ? 200 : 20;

    const now = Date.now();
    const storedTime = localStorage.getItem("zovik_daily_limit_timestamp");
    const storedCount = localStorage.getItem("zovik_daily_msg_count");
    const twentyFourHours = 24 * 60 * 60 * 1000;

    let count = 0;
    if (!storedTime || now - parseInt(storedTime, 10) > twentyFourHours) {
      // 24-hour cycle reset
      localStorage.setItem("zovik_daily_limit_timestamp", now.toString());
      localStorage.setItem("zovik_daily_msg_count", "0");
      count = 0;
    } else {
      count = parseInt(storedCount || "0", 10);
    }

    setMessagesRemaining(Math.max(0, dailyQuota - count));

    const startTime = parseInt(storedTime || now.toString(), 10);
    const msLeft = Math.max(0, twentyFourHours - (now - startTime));
    const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
    const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    setTimeUntilReset(`${hoursLeft}h ${minsLeft}m`);
  }, [authTier]);

  // Load chat history from localStorage or greeting (Zovik companion introductory video)
  useEffect(() => {
    if (character) {
      const storageKey = `zovik_chat_${character.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // If character has a videoUrl and the chat history doesn't have an intro video message,
            // prepend the intro video message so every model's chat starts with their video as requested
            if (character.videoUrl && !parsed.some((m: Message) => m.type === "video")) {
              const introVideoMsg: Message = {
                sender: "ai",
                type: "video",
                videoUrl: character.videoUrl,
                text: character.greeting,
                time: "Just now",
              };
              setMessages([introVideoMsg, ...parsed]);
              return;
            }
            setMessages(parsed);
            return;
          }
        } catch {}
      }
      initializeGreeting(character);
    }
  }, [character]);

  const initializeGreeting = (char: Character) => {
    const initial: Message[] = [];
    if (char.videoUrl) {
      initial.push({
        sender: "ai",
        type: "video",
        videoUrl: char.videoUrl,
        text: char.greeting,
        time: "Just now",
      });
    } else {
      initial.push({
        sender: "ai",
        type: "text",
        text: char.greeting,
        time: "Just now",
      });
    }
    setMessages(initial);
  };

  // Save chat history to localStorage ONLY when user has sent a message
  useEffect(() => {
    if (isStreamingAiText) return;
    if (character && messages.length > 0) {
      const hasUserMessage = messages.some((m) => m.sender === "user");
      if (hasUserMessage) {
        localStorage.setItem(`zovik_chat_${character.id}`, JSON.stringify(messages));
        // Remove from deleted list if user sends a message
        try {
          const deleted = JSON.parse(localStorage.getItem("zovik_deleted_chats") || "[]");
          if (deleted.includes(character.id)) {
            const filtered = deleted.filter((id: string) => id !== character.id);
            localStorage.setItem("zovik_deleted_chats", JSON.stringify(filtered));
          }
        } catch {}
      }
    }
  }, [messages, character, isStreamingAiText]);

  const handleClearHistory = () => {
    if (!character) return;
    localStorage.removeItem(`zovik_chat_${character.id}`);
    try {
      const deleted = JSON.parse(localStorage.getItem("zovik_deleted_chats") || "[]");
      if (!deleted.includes(character.id)) {
        deleted.push(character.id);
        localStorage.setItem("zovik_deleted_chats", JSON.stringify(deleted));
      }
    } catch {}

    initializeGreeting(character);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zovik_chat_updated", { detail: { characterId: character.id } }));
    }
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 2500);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (!character) return null;

  // Real Speech Synthesis Voice supporting all languages (Roman Urdu, Urdu script, Arabic, English)
  const speakText = (text: string, idx: number) => {
    if (!window.speechSynthesis) return;

    if (playingVoiceIdx === idx) {
      window.speechSynthesis.cancel();
      setPlayingVoiceIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingVoiceIdx(idx);

    // Preserve letters of ANY language (Unicode \p{L}), numbers, and punctuation
    const cleanText = text.replace(/[^\p{L}\p{N}\s.,?!'’\-]/gu, "").trim();
    if (!cleanText) {
      setPlayingVoiceIdx(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Language detection
    const isUrduScript = /[\u0600-\u06FF]/.test(cleanText) && /[ٹڈڑچگںےہ]/.test(cleanText);
    const isArabicScript = /[\u0600-\u06FF]/.test(cleanText);

    if (isUrduScript) {
      utterance.lang = "ur-PK";
    } else if (isArabicScript) {
      utterance.lang = "ar-SA";
    } else {
      utterance.lang = "en-US";
    }

    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const isFemale = character.gender !== "male";

      if (isUrduScript || isArabicScript) {
        const langCode = isUrduScript ? "ur" : "ar";
        const scriptVoice = voices.find((v) => v.lang.startsWith(langCode) || v.lang.startsWith("hi"));
        if (scriptVoice) utterance.voice = scriptVoice;
      } else if (isFemale) {
        const femaleVoice = voices.find(
          (v) =>
            v.name.includes("Zira") ||
            v.name.includes("Female") ||
            v.name.includes("Jenny") ||
            v.name.includes("Samantha") ||
            v.name.includes("Google UK English Female") ||
            (v.name.includes("English") && !v.name.includes("David") && !v.name.includes("Male"))
        );
        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.pitch = 1.25; // Feminine sweetness
      } else {
        const maleVoice = voices.find((v) => v.name.includes("David") || v.name.includes("Male"));
        if (maleVoice) utterance.voice = maleVoice;
        utterance.pitch = 0.95;
      }
    };

    selectVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = selectVoice;
    }

    utterance.rate = 1.0;
    utterance.onend = () => setPlayingVoiceIdx(null);
    utterance.onerror = () => setPlayingVoiceIdx(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleCopyMessage = (text: string, idx: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 2000);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isTyping || isStreamingAiText) return;

    // Check message quota
    if (messagesRemaining <= 0) {
      if (!isVipUser) {
        openPremiumModal();
      } else {
        alert("You have reached your daily message limit. It will reset after 24 hours.");
      }
      return;
    }

    const nowTime = Date.now();
    const userMsg: Message = {
      sender: "user",
      text: text.trim(),
      time: "Just now",
      timestamp: nowTime,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText("");
    setIsTyping(true);

    // If user is asking for photo, highlight the image button right next to input
    const isAskingPhoto = /(pic|photo|image|selfie|tasweer|tasveer|tasvir|picture|snd|تصویر|صورة)/i.test(text);
    if (isAskingPhoto) {
      setHighlightPhotoBtn(true);
    }

    // Save immediately and un-delete character in localStorage
    try {
      localStorage.setItem(`zovik_chat_${character.id}`, JSON.stringify(newMessages));
      const deleted = JSON.parse(localStorage.getItem("zovik_deleted_chats") || "[]");
      if (deleted.includes(character.id)) {
        const filtered = deleted.filter((id: string) => id !== character.id);
        localStorage.setItem("zovik_deleted_chats", JSON.stringify(filtered));
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("zovik_chat_updated", { detail: { characterId: character.id } }));
      }
    } catch {}

    // Deduct message count from daily cycle
    const storedCount = parseInt(localStorage.getItem("zovik_daily_msg_count") || "0", 10) + 1;
    localStorage.setItem("zovik_daily_msg_count", storedCount.toString());
    setMessagesRemaining((prev) => Math.max(0, prev - 1));

    try {
      // Call Full-Stack Groq API backend with context
      const preferredLang = typeof window !== "undefined" ? localStorage.getItem("zovik_lang") || "ur" : "ur";
      let token = null;
      let currentUserId: string | undefined;
      if (typeof window !== "undefined" && auth.currentUser) {
        token = await auth.currentUser.getIdToken();
        currentUserId = auth.currentUser.uid;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          character,
          messages: newMessages,
          preferredLang,
          token,
          userTier,
          userId: currentUserId,
        }),
      });

      const data = await res.json();

      // Check if server rejected request due to daily quota limit
      if (res.status === 429 || data.quotaExceeded) {
        setMessagesRemaining(0);
        setIsTyping(false);
        setIsStreamingAiText(false);
        const limitNoticeMsg: Message = {
          sender: "ai",
          text: data.reply || "Meri jaan, aapki aaj ki message limit poori ho chuki hai! VIP upgrade karein 💕",
          time: "Just now",
          timestamp: Date.now(),
        };
        setMessages([...newMessages, limitNoticeMsg]);
        if (!isVipUser) {
          setTimeout(() => openPremiumModal(), 1500);
        }
        return;
      }

      if (data.quota?.remaining !== undefined) {
        setMessagesRemaining(data.quota.remaining);
      }

      const rawAiReply = data.reply || "Aapke sath baat kar ke bohot sukoon milta hai... Aur batao 💕";
      const aiReply = rawAiReply.replace(/\*[^*]*\*/g, "").trim();

      // If AI guides user to press photo button or user asked for photo, highlight the button with glow
      const mentionsPhotoBtn = /(image|button|icon|photo|selfie|🖼|camera|click|press|dabayen|dabao)/i.test(aiReply);
      if (mentionsPhotoBtn || isAskingPhoto) {
        setHighlightPhotoBtn(true);
        setTimeout(() => setHighlightPhotoBtn(false), 9000);
      }

      // Smooth live typewriter typing simulation for ultra-realistic presence
      setIsStreamingAiText(true);
      setIsTyping(false);

      const streamAiMsg: Message = {
        sender: "ai",
        text: "",
        time: "Just now",
        timestamp: Date.now(),
      };

      setMessages([...newMessages, streamAiMsg]);

      const words = aiReply.split(/(\s+)/);
      let accumulated = "";

      for (let i = 0; i < words.length; i++) {
        if (!isMountedRef.current) break;
        accumulated += words[i];
        if (/^\s+$/.test(words[i]) && i < words.length - 1) {
          continue;
        }
        const snapshot = accumulated;
        setMessages((prev) => {
          const next = [...prev];
          if (next.length > 0 && next[next.length - 1].sender === "ai") {
            next[next.length - 1] = {
              ...next[next.length - 1],
              text: snapshot,
            };
          }
          return next;
        });

        const isPunctuation = /[.,!?]/.test(words[i]);
        await new Promise((r) => setTimeout(r, isPunctuation ? 50 : 20));
      }

      if (isMountedRef.current) {
        setIsStreamingAiText(false);

        const finalMessages = [
          ...newMessages,
          {
            sender: "ai",
            text: aiReply,
            time: "Just now",
            timestamp: Date.now(),
          } as Message,
        ];
        setMessages(finalMessages);
        try {
          localStorage.setItem(`zovik_chat_${character.id}`, JSON.stringify(finalMessages));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("zovik_chat_updated", { detail: { characterId: character.id } }));
          }
        } catch {}
      }
    } catch (err) {
      console.error("Chat error:", err);
      setIsStreamingAiText(false);
      const fallbackAiMsg: Message = {
        sender: "ai",
        text: "Main yahin hoon jaan, batao aaj mere bare me kia socha? 😉",
        time: "Just now",
        timestamp: Date.now(),
      };
      const finalFallback = [...newMessages, fallbackAiMsg];
      setMessages(finalFallback);
      try {
        localStorage.setItem(`zovik_chat_${character.id}`, JSON.stringify(finalFallback));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("zovik_chat_updated", { detail: { characterId: character.id } }));
        }
      } catch {}
    } finally {
      setIsTyping(false);
      setIsStreamingAiText(false);
    }
  };

  const handleRequestPhoto = async () => {
    setHighlightPhotoBtn(false);
    if (isTyping) return;

    // Free users cannot view private selfies - guide them to upgrade
    if (userTier === "free" && !isVipUser) {
      openPremiumModal();
      return;
    }

    const nowTime = Date.now();
    const userMsg: Message = {
      sender: "user",
      text: "Can you send me a private selfie? 📸",
      time: "Just now",
      timestamp: nowTime,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      let token = null;
      let currentUserId: string | undefined;
      if (typeof window !== "undefined" && auth.currentUser) {
        token = await auth.currentUser.getIdToken();
        currentUserId = auth.currentUser.uid;
      }

      const seenKey = `zovik_seen_photos_${character.id}`;
      const seenIndices: number[] = JSON.parse(localStorage.getItem(seenKey) || "[]");

      const res = await fetch("/api/generate-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          character,
          characterId: character.id,
          token,
          userTier,
          userId: currentUserId,
          seenIndices,
        }),
      });
      const data = await res.json();
      setIsTyping(false);

      if (res.status === 403 || res.status === 429 || data.quotaExceeded) {
        const quotaNoticeMsg: Message = {
          sender: "ai",
          text: data.reply || "Meri jaan, aapki aaj ki private photos ki daily limit poori ho chuki hai! 💕",
          time: "Just now",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, quotaNoticeMsg]);
        if (userTier === "plus") {
          setTimeout(() => openPremiumModal(), 1500);
        }
        return;
      }

      const finalUrl = data.imageUrl || character.image;
      const caption = data.caption || "Just snapped this private photo for you... 💕";

      // Update sequential non-repeating seen list in localStorage
      if (data.isLoopReset) {
        localStorage.setItem(seenKey, JSON.stringify([data.photoIndex]));
      } else {
        localStorage.setItem(seenKey, JSON.stringify([...seenIndices, data.photoIndex]));
      }

      const photoMsg: Message = {
        sender: "ai",
        type: "image",
        imageUrl: finalUrl,
        text: caption,
        time: "Just now",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, photoMsg]);

      // Save into User Generated VIP Photos Gallery
      try {
        const existing = JSON.parse(localStorage.getItem("zovik_generated_photos") || "[]");
        const newPhotoItem = {
          id: "photo-" + Date.now(),
          characterId: character.id,
          characterName: character.name,
          characterImage: character.image,
          photoUrl: finalUrl,
          caption: caption,
          createdAt: Date.now(),
        };
        localStorage.setItem("zovik_generated_photos", JSON.stringify([newPhotoItem, ...existing]));
      } catch (err) {
        console.warn("Failed to persist to zovik_generated_photos:", err);
      }
    } catch (err) {
      const fallbackMsg: Message = {
        sender: "ai",
        type: "image",
        imageUrl: character.image,
        text: "Here is my favorite photo just for you 💕",
        time: "Just now",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);

      try {
        const existing = JSON.parse(localStorage.getItem("zovik_generated_photos") || "[]");
        const newPhotoItem = {
          id: "photo-" + Date.now(),
          characterId: character.id,
          characterName: character.name,
          characterImage: character.image,
          photoUrl: character.image,
          caption: fallbackMsg.text,
          createdAt: Date.now(),
        };
        localStorage.setItem("zovik_generated_photos", JSON.stringify([newPhotoItem, ...existing]));
      } catch {}
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    "Kesi ho jaan? 💕",
    "Send me a private selfie 📸",
    "Tumhe kis tarah ke larke pasand hain? 😉",
    "Aaj raat ki kia planning hai? ✨",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative flex flex-col w-full h-full md:max-w-3xl md:h-[90vh] bg-[#0d0a0f] md:rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#130d17] border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                onClose();
              }}
              className="md:hidden size-8 rounded-full bg-white/5 flex items-center justify-center text-white"
            >
              <ArrowLeft className="size-4" />
            </button>

            <div className="relative size-11 rounded-full overflow-hidden border border-[#f53b70]/40 shrink-0">
              <Image
                src={character.image}
                alt={character.name}
                fill
                className="object-cover object-top"
                unoptimized
              />
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 border-2 border-[#130d17]" />
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-base font-bold text-white">{character.name}</h3>
                <span className="text-xs text-[#aeaeae]">• {character.age}</span>
                {isVipUser ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase">
                    VIP
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">Online • Active Now</span>
            </div>
          </div>

          {/* Action Header Buttons: Voice Call & VIP upgrade */}
          <div className="flex items-center space-x-2">
            {character.videoUrl && (
              <button
                onClick={() => setPreviewVideoUrl(character.videoUrl || null)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#f53b70]/20 hover:bg-[#f53b70]/30 border border-[#f53b70]/40 text-[#ff80a6] text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md shadow-pink-900/20"
                title="Watch Companion Intro Video"
              >
                <Film className="size-3.5 text-[#f53b70]" />
                <span className="hidden sm:inline">Intro Video</span>
              </button>
            )}

            {!isVipUser && (
              <button
                onClick={openPremiumModal}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:scale-105 transition-all"
              >
                <Crown className="size-3.5" />
                <span>Get VIP</span>
              </button>
            )}

            <button
              onClick={() => {
                if (!isVipUser) {
                  openPremiumModal();
                } else {
                  onStartCall(character);
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white text-xs font-bold shadow-md shadow-pink-600/30 hover:brightness-110 transition-all"
            >
              <Phone className="size-3.5 fill-white" />
              <span>Voice Call</span>
            </button>

            <button
              onClick={handleClearHistory}
              title="Clear Chat History"
              className="relative size-8 rounded-full bg-white/5 hover:bg-red-500/20 text-[#aeaeae] hover:text-red-400 flex items-center justify-center transition-colors"
            >
              <Trash2 className="size-4" />
            </button>

            <button
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                onClose();
              }}
              className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#aeaeae] hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Clear Notice Toast */}
        {clearedNotice && (
          <div className="flex items-center justify-center py-1.5 px-4 bg-red-500/20 border-b border-red-500/30 text-xs font-bold text-red-300 animate-fadeIn">
            <span>✓ All chat messages with {character.name} cleared</span>
          </div>
        )}

        {/* Daily 24H Message Counter Bar for Free, Plus, and VIP */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#1f1225] border-b border-[#f53b70]/20 text-[11px] text-[#f1d0de]">
          <div className="flex items-center space-x-2">
            <Sparkles className="size-3.5 text-[#f53b70]" />
            <span>
              {userTier === "vip" ? (
                <>VIP Elite: <strong className="text-white">{messagesRemaining} / 500</strong> Daily Messages</>
              ) : userTier === "plus" ? (
                <>Plus Plan: <strong className="text-white">{messagesRemaining} / 200</strong> Daily Messages</>
              ) : (
                <>Free Daily Messages: <strong className="text-white">{messagesRemaining} / 20</strong></>
              )}
            </span>
          </div>
          {timeUntilReset && (
            <span className="text-[10px] text-white/50">Resets in {timeUntilReset}</span>
          )}
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => {
            const isAI = msg.sender === "ai";

            // Zovik AI Introduction Video Message
            if (msg.type === "video") {
              return (
                <div key={idx} className="flex items-start space-x-2 max-w-[85%] sm:max-w-sm">
                  <div className="relative size-8 rounded-full overflow-hidden shrink-0 mt-1">
                    <Image src={character.image} alt="" fill className="object-cover object-top" unoptimized />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#1a1221] border border-[#f53b70]/30 text-white shadow-xl shadow-pink-950/20">
                    <ChatVideoPlayer
                      src={msg.videoUrl || character.videoUrl || ""}
                      poster={character.image}
                      onExpand={() => setPreviewVideoUrl(msg.videoUrl || character.videoUrl || null)}
                    />
                    {msg.text && (
                      <p className="text-xs text-[#e0d6dc] mt-2 mb-1 leading-relaxed">
                        {msg.text.replace(/\*[^*]*\*/g, "").trim()}
                      </p>
                    )}
                    <span className="block text-[10px] text-[#aeaeae] text-right mt-1">{msg.time}</span>
                  </div>
                </div>
              );
            }

            // Heavy Blurred Image Paywall for Free Users / Unblurred for VIP
            if (msg.type === "image") {
              return (
                <div key={idx} className="flex items-start space-x-2 max-w-[85%] sm:max-w-sm">
                  <div className="relative size-8 rounded-full overflow-hidden shrink-0 mt-1">
                    <Image src={character.image} alt="" fill className="object-cover object-top" unoptimized />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#1a1221] border border-white/10 text-white shadow-md">
                    <div
                      onClick={() => {
                        if (isVipUser) {
                          setPreviewPhotoUrl(msg.imageUrl || character.image);
                        }
                      }}
                      className={`relative w-64 h-80 rounded-xl overflow-hidden bg-black mb-2 ${
                        isVipUser ? "cursor-pointer group" : ""
                      }`}
                    >
                      <Image
                        src={msg.imageUrl || character.image}
                        alt="Private Photo"
                        fill
                        className={`object-cover object-top transition-all duration-500 ${
                          isVipUser ? "blur-0 group-hover:scale-105" : "blur-2xl scale-110"
                        }`}
                        unoptimized
                      />

                      {/* VIP Unblurred Tag */}
                      {isVipUser && (
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/60 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider backdrop-blur-md flex items-center space-x-1">
                          <span>✨ HD Unblurred</span>
                        </div>
                      )}

                      {/* Heavy Blur Lock Overlay for Free User */}
                      {!isVipUser && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center select-none">
                          <div className="size-14 rounded-full bg-[#f53b70]/20 border border-[#f53b70] flex items-center justify-center mb-3 shadow-lg shadow-pink-600/30">
                            <Lock className="size-7 text-[#f53b70]" />
                          </div>
                          <span className="text-sm font-black text-white mb-1">Private Spicy Photo</span>
                          <span className="text-[11px] text-[#aeaeae] mb-4">
                            Photo is locked & blurred for Free users.
                          </span>
                          <button
                            onClick={openPremiumModal}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white text-xs font-black tracking-wide shadow-xl shadow-pink-600/40 hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5"
                          >
                            <Crown className="size-4" />
                            <span>Unlock with VIP</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {msg.text && (
                      <p className="text-xs text-[#e0d6dc] mb-1">
                        {msg.text.replace(/\*[^*]*\*/g, "").trim()}
                      </p>
                    )}
                    <span className="block text-[10px] text-[#aeaeae] text-right">{msg.time}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                className={`flex items-end space-x-2 ${
                  isAI ? "justify-start" : "justify-end"
                }`}
              >
                {isAI && (
                  <div className="relative size-7 rounded-full overflow-hidden shrink-0 mb-1">
                    <Image src={character.image} alt="" fill className="object-cover object-top" unoptimized />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] sm:max-w-lg md:max-w-xl px-4 py-3 rounded-2xl text-xs md:text-sm ${
                    isAI
                      ? "bg-[#181120] border border-white/10 text-[#f0eaf2] rounded-bl-sm"
                      : "bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white rounded-br-sm shadow-md shadow-pink-600/20"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-line">
                    {msg.text ? msg.text.replace(/\*[^*]*\*/g, "").trim() : ""}
                    {isStreamingAiText && isAI && idx === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-3.5 bg-[#f53b70] animate-pulse ml-0.5 align-middle rounded-sm" />
                    )}
                  </p>
                  <div className="flex items-center justify-between space-x-2 mt-1">
                    {isAI ? (
                      <div className="flex items-center space-x-2.5">
                        <button
                          onClick={() => speakText(msg.text || "", idx)}
                          title="Listen to this message in voice"
                          className="text-[10px] text-[#aeaeae] hover:text-[#f53b70] flex items-center space-x-1 transition-colors"
                        >
                          <Volume2 className="size-3" />
                          <span>{playingVoiceIdx === idx ? "Speaking..." : "Voice"}</span>
                        </button>
                        <button
                          onClick={() => handleCopyMessage(msg.text || "", idx)}
                          title="Copy message"
                          className="text-[10px] text-[#aeaeae] hover:text-white flex items-center space-x-1 transition-colors"
                        >
                          {copiedMsgIdx === idx ? (
                            <>
                              <Check className="size-3 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center space-x-1">
                      <span className="text-[9px] text-white/50">{msg.time}</span>
                      {!isAI && <CheckCheck className="size-3 text-white/80" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center space-x-2 text-xs text-[#aeaeae]">
              <div className="relative size-6 rounded-full overflow-hidden">
                <Image src={character.image} alt="" fill className="object-cover" unoptimized />
              </div>
              <div className="flex items-center space-x-1 px-3 py-2 rounded-2xl bg-[#181120] border border-white/10">
                <span className="size-1.5 rounded-full bg-[#f53b70] animate-bounce" />
                <span className="size-1.5 rounded-full bg-[#f53b70] animate-bounce [animation-delay:0.2s]" />
                <span className="size-1.5 rounded-full bg-[#f53b70] animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="flex items-center space-x-2 px-4 py-2 overflow-x-auto no-scrollbar border-t border-white/5 bg-[#100a14]">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-[#aeaeae] hover:text-white shrink-0 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Daily Quota Exhausted Banner */}
        {!isVipUser && messagesRemaining <= 0 && (
          <div className="p-3 bg-gradient-to-r from-red-950/80 via-[#260a18] to-red-950/80 border-t border-red-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-red-200">
              <AlertCircle className="size-4 text-red-400 shrink-0" />
              <span>You reached your 20 free daily messages! Upgrade to Plus or VIP for unlimited chat.</span>
            </div>
            <button
              onClick={openPremiumModal}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white text-xs font-bold hover:brightness-110 shadow-md shrink-0"
            >
              Upgrade Now
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 md:p-4 bg-[#130d17] border-t border-white/10 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            {/* Request Photo Button with Pulsing Glow & Tooltip */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setHighlightPhotoBtn(false);
                  handleRequestPhoto();
                }}
                title="Request Private Selfie (Press for photo)"
                className={`size-10 rounded-xl flex items-center justify-center transition-all ${
                  highlightPhotoBtn
                    ? "bg-[#f53b70] text-white ring-4 ring-[#f53b70]/50 scale-105 shadow-lg shadow-pink-600/50 animate-pulse"
                    : "bg-white/5 hover:bg-[#f53b70]/20 border border-white/10 text-[#aeaeae] hover:text-[#f53b70]"
                }`}
              >
                <ImageIcon className="size-5" />
              </button>
              {highlightPhotoBtn && (
                <span className="absolute -top-8 left-0 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white text-[10px] font-black tracking-wide whitespace-nowrap shadow-xl shadow-pink-600/50 animate-bounce pointer-events-none flex items-center space-x-1">
                  <span>📸 Click here for photo!</span>
                </span>
              )}
            </div>

            {/* Input field */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!isVipUser && messagesRemaining <= 0}
              placeholder={
                !isVipUser && messagesRemaining <= 0
                  ? "Daily limit reached. Get VIP for unlimited chat..."
                  : `Message ${character.name}...`
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#1b1322] border border-white/10 text-white placeholder-[#777] text-sm focus:outline-none focus:border-[#f53b70] transition-colors disabled:opacity-50"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping || (!isVipUser && messagesRemaining <= 0)}
              className="size-10 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all shrink-0 shadow-md shadow-pink-600/30"
            >
              {isTyping ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      </div>

      {/* Fullscreen Photo Zoom Modal for VIP */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-2xl max-h-[90vh] w-full h-[85vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
            <Image
              src={previewPhotoUrl}
              alt="High Res Photo"
              fill
              className="object-contain"
              unoptimized
            />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 size-10 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 flex items-center justify-center transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Video Cinema Modal */}
      {previewVideoUrl && (
        <CinemaVideoModal
          src={previewVideoUrl}
          onClose={() => setPreviewVideoUrl(null)}
        />
      )}
    </div>
  );
}

function CinemaVideoModal({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  const [videoSrc, setVideoSrc] = useState<string>(() => getSafeStreamUrl(src));

  useEffect(() => {
    let active = true;
    fetchVideoBlobUrl(src).then((blobUrl) => {
      if (active && blobUrl) setVideoSrc(blobUrl);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 animate-fadeIn cursor-zoom-out"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-sm sm:max-w-md w-full h-[85vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black flex items-center justify-center cursor-default"
      >
        <video
          src={videoSrc}
          autoPlay
          controls
          playsInline
          className="w-full h-full object-contain"
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 size-10 rounded-full bg-black/80 hover:bg-black text-white border border-white/25 flex items-center justify-center transition-all shadow-xl"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
