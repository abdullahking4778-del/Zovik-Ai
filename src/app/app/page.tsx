"use client";

import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import ExperienceCards from "@/components/ExperienceCards";
import CharacterRow from "@/components/CharacterRow";
import FilterBar from "@/components/FilterBar";
import CharacterCard from "@/components/CharacterCard";
import CharacterModal from "@/components/CharacterModal";
import ChatModal from "@/components/ChatModal";
import CreateCharacterModal from "@/components/CreateCharacterModal";
import PremiumModal from "@/components/PremiumModal";
import LoginModal from "@/components/LoginModal";
import RouletteModal from "@/components/RouletteModal";
import ShortsModal from "@/components/ShortsModal";
import PwaInstallModal from "@/components/PwaInstallModal";
import UserProfileModal from "@/components/UserProfileModal";
import CompanionToast from "@/components/CompanionToast";
import rawCharacters from "@/data/characters.json";
import { Character, Message, SavedPhoto } from "@/types";
import Image from "next/image";
import { normalizeTags } from "@/lib/tagHelper";
import { getSafeImageUrl } from "@/lib/imageHelper";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutGrid,
  Rows,
  Sparkles,
  Heart,
  PlusCircle,
  Lock,
  Crown,
  MessageCircle,
  FolderHeart,
  UserCheck,
  Trash2,
  Search,
  X,
  Eye,
  Camera,
} from "lucide-react";

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>(rawCharacters as Character[]);

  useEffect(() => {
    fetch("/api/characters", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data?.success && Array.isArray(data.characters)) {
          setCharacters(data.characters);
        }
      })
      .catch(err => console.error("Error fetching live characters:", err));
  }, []);

  const [activeTab, setActiveTab] = useState("home");
  const [genderFilter, setGenderFilter] = useState<"female" | "male" | "anime">("female");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"rows" | "grid">("rows");

  // User Auth State
  const { 
    user: currentUser, 
    tier: currentTier, 
    isLoginOpen: authLoginOpen, 
    setIsLoginOpen: setAuthLoginOpen, 
    requireAuth,
    isLocallyLoggedIn,
    userData
  } = useAuth();

  // Private VIP Gallery states
  const [generatedPhotos, setGeneratedPhotos] = useState<SavedPhoto[]>([]);
  const [viewingPhoto, setViewingPhoto] = useState<SavedPhoto | null>(null);

  // Liked/Collection Characters ID state
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [deletedChatIds, setDeletedChatIds] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Modals state
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [activeChatCharacter, setActiveChatCharacter] = useState<Character | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);

  // Check if current user is VIP or Plus subscriber (Both get unrestricted access to VIP companions)
  const isPaidUser = useMemo(() => {
    return currentTier === "vip" || currentTier === "plus";
  }, [currentTier]);

  const isCharacterVip = (char: Character) => {
    return char.accessTier === "vip" || char.accessTier === "plus" || char.isVipOnly === true;
  };

  // Smart Auth Guarded Actions (pay-as-you-go Coins Economy)
  const handleStartChatWithAuth = (char: Character) => {
    requireAuth(() => {
      setActiveChatCharacter(char);
    }, `${char.name} ke sath chat shuru karne ke liye pehle sign in karein.`);
  };
  const [isShortsOpen, setIsShortsOpen] = useState(false);
  const [initialReelId, setInitialReelId] = useState<string | null>(null);
  const [isPwaOpen, setIsPwaOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [chatRefreshTick, setChatRefreshTick] = useState(0);

  // Deep-link check for shared short reel URL (?reel=id)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reelParam = params.get("reel");
    if (reelParam) {
      setInitialReelId(reelParam);
      setIsShortsOpen(true);
    }
  }, []);

  // Load custom characters, and liked characters
  useEffect(() => {
    // 1. Liked collection
    try {
      const savedLikes = localStorage.getItem("zovik_likes");
      if (savedLikes) {
        const parsed = JSON.parse(savedLikes);
        if (Array.isArray(parsed)) {
          setLikedIds(parsed);
        }
      } else {
        const defaultLikes = ["aria-solis", "alexander-sterling"];
        setLikedIds(defaultLikes);
        localStorage.setItem("zovik_likes", JSON.stringify(defaultLikes));
      }
    } catch {}

    // 3. Deleted / Cleared Chats
    try {
      const storedDeleted = localStorage.getItem("zovik_deleted_chats");
      if (storedDeleted) {
        setDeletedChatIds(JSON.parse(storedDeleted));
      }
    } catch {}

    // 4. Characters
    fetch("/api/characters", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.characters && Array.isArray(data.characters)) {
          setCharacters(data.characters);
        }
      })
      .catch((err) => console.warn("Failed to load characters:", err));

    // Deep linking from Landing Page URL parameters (?chat=..., ?login=true, ?create=true, ?shorts=true)
    try {
      const params = new URLSearchParams(window.location.search);
      const chatParam = params.get("chat");
      const loginParam = params.get("login");
      const createParam = params.get("create");
      const shortsParam = params.get("shorts");
      const premiumParam = params.get("openPremium") || params.get("premium");

      if (premiumParam === "true") setIsPremiumOpen(true);
      if (loginParam === "true") {
        if (!currentUser && !isLocallyLoggedIn) {
          setIsLoginOpen(true);
        }
      }
      if (createParam === "true") setIsCreateOpen(true);
      if (shortsParam === "true") setIsShortsOpen(true);

      if (chatParam) {
        const match = (rawCharacters as Character[]).find(
          (c) => c.id.toLowerCase() === chatParam.toLowerCase() || c.name.toLowerCase().includes(chatParam.toLowerCase())
        );
        if (match) setActiveChatCharacter(match);
      }

      // Immediately clean URL so parameters are never sticky across tab reloads/refreshes
      if (chatParam || loginParam || createParam || shortsParam || premiumParam) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch {}

    const handleOpenPremiumEvent = () => setIsPremiumOpen(true);
    window.addEventListener("open-premium-modal", handleOpenPremiumEvent);
    return () => {
      window.removeEventListener("open-premium-modal", handleOpenPremiumEvent);
    };
  }, []);

  // Sync Generated Photos for Private VIP Gallery
  useEffect(() => {
    try {
      const stored = localStorage.getItem("zovik_generated_photos");
      if (stored) {
        setGeneratedPhotos(JSON.parse(stored));
      } else {
        setGeneratedPhotos([]);
      }
    } catch {}
  }, [activeTab, activeChatCharacter, chatRefreshTick]);

  // Real-time Chat Sync across Modals, Tabs, and Storage
  useEffect(() => {
    const handleChatUpdate = () => {
      setChatRefreshTick((prev) => prev + 1);
    };
    window.addEventListener("zovik_chat_updated", handleChatUpdate);
    window.addEventListener("storage", handleChatUpdate);
    return () => {
      window.removeEventListener("zovik_chat_updated", handleChatUpdate);
      window.removeEventListener("storage", handleChatUpdate);
    };
  }, []);

  // Coins Economy: All requested photos and chats are preserved permanently
  useEffect(() => {
    try {
      const savedPhotosStr = localStorage.getItem("zovik_generated_photos");
      if (savedPhotosStr) {
        const photos = JSON.parse(savedPhotosStr);
        if (Array.isArray(photos)) {
          setGeneratedPhotos(photos);
        }
      }
    } catch (e) {
      console.warn("Photos loader warning:", e);
    }
  }, []);


  // Strictly Filtered Characters logic (Girls vs Boys vs Anime)
  const filteredCharacters = useMemo(() => {
    return characters.filter((char) => {
      // 1. Strict Gender / Style Filter
      if (genderFilter === "female") {
        if (char.gender !== "female") return false;
      } else if (genderFilter === "male") {
        if (char.gender !== "male") return false;
      } else if (genderFilter === "anime") {
        if (char.style !== "anime") return false;
      }

      // 2. Category Filter (Strictly Mutually Exclusive)
      if (selectedCategory !== "All") {
        if (selectedCategory === "Trending" && char.category !== "Trending") return false;
        if (selectedCategory === "Hot" && char.category !== "Hot") return false;
        if (selectedCategory === "Popular" && char.category !== "Popular") return false;
        if (selectedCategory === "Roleplay" && char.category !== "Roleplay") return false;
        if (selectedCategory === "Anime" && char.category !== "Anime" && char.style !== "anime") return false;
      }

      // 3. Search Query Match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = char.name.toLowerCase().includes(q);
        const matchesDesc = (char.desc || "").toLowerCase().includes(q) || (char.tagline || "").toLowerCase().includes(q);
        const safeTags = normalizeTags(char.tags);
        const matchesTag = safeTags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesTag) return false;
      }

      return true;
    });
  }, [characters, genderFilter, selectedCategory, searchQuery]);

  // Horizontal Rows strictly mutually exclusive (ZERO duplicates across categories)
  const { rowTrending, rowHot, rowPopular, rowRoleplay, rowAnime } = useMemo(() => {
    const seenIds = new Set<string>();

    const filterUnique = (list: Character[]) => {
      return list.filter((c) => {
        if (seenIds.has(c.id)) return false;
        seenIds.add(c.id);
        return true;
      });
    };

    // 1. Trending: strictly category "Trending"
    const trending = filterUnique(filteredCharacters.filter((c) => c.category === "Trending" && c.style !== "anime"));

    // 2. Hot: strictly category "Hot"
    const hot = filterUnique(filteredCharacters.filter((c) => c.category === "Hot" && c.style !== "anime"));

    // 3. Most Popular & VIP: strictly category "Popular"
    const popular = filterUnique(filteredCharacters.filter((c) => c.category === "Popular" && c.style !== "anime"));

    // 4. Deep Roleplay & Secret Affairs: strictly category "Roleplay"
    const roleplay = filterUnique(filteredCharacters.filter((c) => c.category === "Roleplay" && c.style !== "anime"));

    // 5. Anime & Manga Series: strictly category "Anime" or style "anime"
    const anime = filterUnique(filteredCharacters.filter((c) => c.category === "Anime" || c.style === "anime"));

    return {
      rowTrending: trending,
      rowHot: hot,
      rowPopular: popular,
      rowRoleplay: roleplay,
      rowAnime: anime,
    };
  }, [filteredCharacters]);

  // My AI Characters (Custom created)
  const myAiChars = useMemo(
    () => characters.filter((c) => c.id.startsWith("custom-") || c.badge === "MY AI"),
    [characters]
  );

  // Collection Characters (Liked)
  const collectionChars = useMemo(
    () => characters.filter((c) => likedIds.includes(c.id)),
    [characters, likedIds]
  );

  // Active Conversations (strictly active chat threads where user participated, sorted by recent activity)
  const [activeConversations, setActiveConversations] = useState<{
    character: Character;
    lastMessage: string;
    lastTime: string;
    lastTimestamp: number;
    messageCount: number;
  }[]>([]);

  useEffect(() => {
    let currentDeleted: string[] = [];
    try {
      const stored = localStorage.getItem("zovik_deleted_chats");
      if (stored) currentDeleted = JSON.parse(stored);
    } catch {}

    const list: {
      character: Character;
      lastMessage: string;
      lastTime: string;
      lastTimestamp: number;
      messageCount: number;
    }[] = [];

    // Map of known characters for fast lookup
    const charMap = new Map<string, Character>();
    characters.forEach((char) => charMap.set(char.id, char));

    const processedIds = new Set<string>();

    // 1. Scan all localStorage keys starting with "zovik_chat_"
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("zovik_chat_")) {
          const charId = key.replace("zovik_chat_", "");
          if (currentDeleted.includes(charId) || processedIds.has(charId)) continue;

          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const msgs = JSON.parse(raw);
              if (Array.isArray(msgs) && msgs.length > 0) {
                const hasUserMsg = msgs.some((m: Message) => m.sender === "user");
                if (!hasUserMsg && msgs.length <= 1) continue;

                const char = charMap.get(charId);
                if (char) {
                  processedIds.add(charId);
                  const lastMsg = msgs[msgs.length - 1];
                  list.push({
                    character: char,
                    lastMessage: lastMsg.text || (lastMsg.type === "image" ? "Sent a private photo 📸" : "Hey!"),
                    lastTime: lastMsg.time || "Recently",
                    lastTimestamp: lastMsg.timestamp || 0,
                    messageCount: msgs.length,
                  });
                }
              }
            }
          } catch {}
        }
      }

      // 2. Also check any characters in state
      characters.forEach((char) => {
        if (currentDeleted.includes(char.id) || processedIds.has(char.id)) return;

        const saved = localStorage.getItem(`zovik_chat_${char.id}`);
        if (saved) {
          try {
            const msgs = JSON.parse(saved);
            if (Array.isArray(msgs) && msgs.length > 0) {
              const hasUserMsg = msgs.some((m: Message) => m.sender === "user");
              if (!hasUserMsg && msgs.length <= 1) return;

              processedIds.add(char.id);
              const lastMsg = msgs[msgs.length - 1];
              list.push({
                character: char,
                lastMessage: lastMsg.text || (lastMsg.type === "image" ? "Sent a private photo 📸" : "Hey!"),
                lastTime: lastMsg.time || "Recently",
                lastTimestamp: lastMsg.timestamp || 0,
                messageCount: msgs.length,
              });
            }
          } catch {}
        }
      });
    } catch {}

    // Sort by latest message timestamp descending (most recently active chat at the top!)
    list.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));

    setActiveConversations(list);
  }, [characters, activeChatCharacter, chatRefreshTick, activeTab]);

  const handleCharacterCreated = async (newChar: Character) => {
    setCharacters((prev) => [newChar, ...prev]);
    setSelectedCharacter(newChar);

    try {
      await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newChar),
      });
    } catch (e) {
      console.warn("Failed to persist character to server:", e);
    }
  };

  const handleDeleteCustomCompanion = async (charId: string, charName: string) => {
    try {
      // Instantly remove from state & storage
      setCharacters((prev) => prev.filter((c) => c.id !== charId));
      localStorage.removeItem(`zovik_chat_${charId}`);
      
      let updated: string[] = [];
      try {
        const stored = localStorage.getItem("zovik_deleted_chats");
        const current = stored ? JSON.parse(stored) : [];
        updated = [...new Set([...current, charId])];
        localStorage.setItem("zovik_deleted_chats", JSON.stringify(updated));
      } catch {
        updated = [charId];
      }
      setDeletedChatIds(updated);
      setChatRefreshTick((t) => t + 1);

      window.dispatchEvent(new CustomEvent("zovik_chat_updated", { detail: { characterId: charId } }));

      showNotice(`✓ ${charName} deleted permanently`);

      await fetch(`/api/characters?id=${charId}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Failed to delete companion:", e);
    }
  };

  const handleDeleteConversation = (charId: string, charName: string) => {
    // Instantly remove from localStorage and state
    localStorage.removeItem(`zovik_chat_${charId}`);
    
    let updated: string[] = [];
    try {
      const stored = localStorage.getItem("zovik_deleted_chats");
      const current = stored ? JSON.parse(stored) : [];
      updated = [...new Set([...current, charId])];
      localStorage.setItem("zovik_deleted_chats", JSON.stringify(updated));
    } catch {
      updated = [charId];
    }
    setDeletedChatIds(updated);
    setChatRefreshTick((t) => t + 1);

    window.dispatchEvent(new CustomEvent("zovik_chat_updated", { detail: { characterId: charId } }));

    showNotice(`✓ Chat history with ${charName} deleted`);
  };

  const handleToggleLike = (character: Character, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLikedIds((prev) => {
      let next: string[];
      if (prev.includes(character.id)) {
        next = prev.filter((id) => id !== character.id);
        showNotice(`Removed ${character.name} from Collection`);
      } else {
        next = [...prev, character.id];
        showNotice(`❤️ Saved ${character.name} to Collection!`);
      }
      try {
        localStorage.setItem("zovik_likes", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleOpenCreateCompanion = () => {
    requireAuth(() => {
      setIsCreateOpen(true);
    }, "Apna custom AI Companion banane ke liye pehle sign in karein.");
  };

  const handleDeleteGeneratedPhoto = (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation();
    try {
      const stored = localStorage.getItem("zovik_generated_photos");
      if (stored) {
        const photos = JSON.parse(stored);
        const updated = photos.filter((p: SavedPhoto) => p.id !== photoId);
        localStorage.setItem("zovik_generated_photos", JSON.stringify(updated));
        setGeneratedPhotos(updated);
      }
      if (viewingPhoto && viewingPhoto.id === photoId) {
        setViewingPhoto(null);
      }
      showNotice("✓ Photo deleted from your private gallery");
    } catch (err) {
      console.warn("Failed to delete photo:", err);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0d0a0f] text-white">
      {/* Desktop Sticky Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === "shorts") {
            setIsShortsOpen(true);
          } else if (tab === "chat" || tab === "my-ai" || tab === "private") {
            requireAuth(() => setActiveTab(tab), `${tab.toUpperCase()} access karne ke liye pehle login karein.`);
          } else {
            setActiveTab(tab);
          }
        }}
        openPremiumModal={() => setIsPremiumOpen(true)}
        openCreateModal={handleOpenCreateCompanion}
        unreadCount={activeConversations.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        {/* Top Sticky Header */}
        <Header
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          openLoginModal={() => setIsLoginOpen(true)}
          openPremiumModal={() => setIsPremiumOpen(true)}
          openPwaModal={() => setIsPwaOpen(true)}
          openProfileModal={() => setIsProfileOpen(true)}
        />

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="sticky top-16 z-20 flex items-center justify-center py-2 px-4 bg-emerald-500/20 border-b border-emerald-500/40 text-xs font-bold text-emerald-300 backdrop-blur-md animate-fadeIn shadow-lg">
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Content Body Based on Active Tab */}
        <main className="px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {/* ================= VIEW: HOME ================= */}
          {activeTab === "home" && (
            <>
              {/* Hero Promotional Carousel */}
              <HeroCarousel
                genderFilter={genderFilter}
                openPremiumModal={() => setIsPremiumOpen(true)}
                openCreateModal={handleOpenCreateCompanion}
              />

              {/* Featured Experience Cards */}
              <ExperienceCards
                onOpenShorts={() => setIsShortsOpen(true)}
                onOpenRoulette={() => requireAuth(() => setIsRouletteOpen(true), "Roulette spin karne ke liye login zaroori hai.")}
                onOpenCreate={handleOpenCreateCompanion}
              />

              {/* Filter Bar & View Toggle */}
              <div id="character-grid" className="flex items-center justify-between scroll-mt-20">
                <div className="flex-1 min-w-0">
                  <FilterBar
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    characterCount={filteredCharacters.length}
                  />
                </div>

                <div className="flex items-center space-x-1 p-1 rounded-xl bg-[#17101e] border border-white/5 shrink-0 ml-4 mb-3">
                  <button
                    onClick={() => setViewMode("rows")}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === "rows" ? "bg-[#f53b70] text-white" : "text-[#888] hover:text-white"
                    }`}
                    title="Browse in Horizontal Rows"
                  >
                    <Rows className="size-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === "grid" ? "bg-[#f53b70] text-white" : "text-[#888] hover:text-white"
                    }`}
                    title="Browse in Grid View"
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                </div>
              </div>

              {/* Display Mode 1: Horizontal Rows */}
              {viewMode === "rows" && selectedCategory === "All" && !searchQuery ? (
                <div className="space-y-8">
                  {/* 1. Trending Row */}
                  {rowTrending.length > 0 && (
                    <CharacterRow
                      title={`🔥 Trending ${genderFilter === "female" ? "Girls" : genderFilter === "male" ? "Boys" : "Companions"}`}
                      badge="TRENDING"
                      characters={rowTrending}
                      onSelect={(char) => setSelectedCharacter(char)}
                      onStartChat={handleStartChatWithAuth}
                      likedIds={likedIds}
                      onToggleLike={handleToggleLike}
                      isPaidUser={isPaidUser}
                    />
                  )}

                  {/* 2. Hot Row */}
                  {rowHot.length > 0 && (
                    <CharacterRow
                      title={`🌶️ Hot ${genderFilter === "female" ? "Girls" : genderFilter === "male" ? "Boys" : "Companions"}`}
                      badge="HOT"
                      characters={rowHot}
                      onSelect={(char) => setSelectedCharacter(char)}
                      onStartChat={handleStartChatWithAuth}
                      likedIds={likedIds}
                      onToggleLike={handleToggleLike}
                      isPaidUser={isPaidUser}
                    />
                  )}

                  {/* 3. Most Popular Row */}
                  {rowPopular.length > 0 && (
                    <CharacterRow
                      title={`⭐ Most Popular ${genderFilter === "female" ? "Girls" : genderFilter === "male" ? "Boys" : ""}`}
                      badge="POPULAR"
                      characters={rowPopular}
                      onSelect={(char) => setSelectedCharacter(char)}
                      onStartChat={handleStartChatWithAuth}
                      likedIds={likedIds}
                      onToggleLike={handleToggleLike}
                      isPaidUser={isPaidUser}
                    />
                  )}

                  {/* 4. Deep Roleplay & Secret Affairs Row */}
                  {rowRoleplay.length > 0 && (
                    <CharacterRow
                      title={`🎭 Deep Roleplay & Secrets ${genderFilter === "female" ? "Girls" : genderFilter === "male" ? "Boys" : ""}`}
                      badge="ROLEPLAY"
                      characters={rowRoleplay}
                      onSelect={(char) => setSelectedCharacter(char)}
                      onStartChat={handleStartChatWithAuth}
                      likedIds={likedIds}
                      onToggleLike={handleToggleLike}
                      isPaidUser={isPaidUser}
                    />
                  )}

                  {/* 5. Anime & Manga Series Row */}
                  {rowAnime.length > 0 && (
                    <CharacterRow
                      title="🌸 Anime & Fantasy Series"
                      badge="ANIME"
                      characters={rowAnime}
                      onSelect={(char) => setSelectedCharacter(char)}
                      onStartChat={handleStartChatWithAuth}
                      likedIds={likedIds}
                      onToggleLike={handleToggleLike}
                      isPaidUser={isPaidUser}
                    />
                  )}
                </div>
              ) : (
                /* Display Mode 2: Grid View */
                <div>
                  {filteredCharacters.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3.5 sm:gap-5 md:gap-6">
                      {filteredCharacters.map((character) => (
                        <CharacterCard
                          key={character.id}
                          character={character}
                          onSelect={(char) => setSelectedCharacter(char)}
                          onStartChat={handleStartChatWithAuth}
                          isLiked={likedIds.includes(character.id)}
                          onToggleLike={handleToggleLike}
                          isPaidUser={isPaidUser}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center space-y-3 bg-[#130d17] rounded-3xl border border-white/5 my-6 p-6">
                      <span className="text-4xl">🔍</span>
                      <h3 className="text-lg font-bold text-white">No companions found</h3>
                      <button
                        onClick={() => {
                          setSelectedCategory("All");
                          setSearchQuery("");
                        }}
                        className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/20 transition-all"
                      >
                        Reset Filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ================= VIEW: DISCOVER ================= */}
          {activeTab === "discover" && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-white">Discover Companions</h2>
                  <p className="text-xs text-[#aeaeae]">
                    Browse through all {filteredCharacters.length} verified AI companions.
                  </p>
                </div>
              </div>

              <FilterBar
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                characterCount={filteredCharacters.length}
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3.5 sm:gap-5 md:gap-6 mt-4">
                {filteredCharacters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onSelect={(char) => setSelectedCharacter(char)}
                    onStartChat={handleStartChatWithAuth}
                    isLiked={likedIds.includes(character.id)}
                    onToggleLike={handleToggleLike}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ================= VIEW: CHAT / CONVERSATIONS (MESSENGER INBOX) ================= */}
          {activeTab === "chat" && (
            <div className="pt-2 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="size-6 text-[#f53b70]" />
                    <h2 className="text-2xl font-black text-white">My Conversations</h2>
                  </div>
                  <p className="text-xs text-[#aeaeae]">
                    Active chats with companions you have spoken to.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab("discover")}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                  Explore More
                </button>
              </div>

              {activeConversations.length > 0 ? (
                <div className="space-y-3">
                  {activeConversations.map(({ character, lastMessage, lastTime }) => (
                    <div
                      key={character.id}
                      onClick={() => handleStartChatWithAuth(character)}
                      className="group flex items-center justify-between p-4 rounded-3xl bg-[#140b1c] hover:bg-[#1a0f24] border border-white/5 hover:border-[#f53b70]/40 cursor-pointer transition-all shadow-lg"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        {/* Avatar with live pulsing green online dot */}
                        <div className="relative size-14 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                          <Image
                            src={character.image}
                            alt={character.name}
                            fill
                            className="object-cover object-top group-hover:scale-105 transition-transform"
                            unoptimized
                          />
                          <span className="absolute bottom-1 right-1 size-3 rounded-full bg-emerald-400 border-2 border-[#140b1c] shadow-sm animate-pulse" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-base font-extrabold text-white truncate">
                              {character.name}
                            </h4>
                            <span className="text-xs text-[#aeaeae]">• {character.age}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-[#f53b70]/20 text-[#f53b70] text-[9px] font-black uppercase">
                              Active
                            </span>
                          </div>
                          <p className="text-xs text-[#d5c7d0] truncate max-w-xs sm:max-w-md mt-0.5">
                            {lastMessage}
                          </p>
                        </div>
                      </div>

                      {/* Right Actions: Time & Delete Chat */}
                      <div className="flex items-center space-x-2 shrink-0 ml-3">
                        <span className="text-[11px] text-[#888] hidden sm:inline">
                          {lastTime}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(character.id, character.name);
                          }}
                          title="Delete Chat History"
                          className="size-8 rounded-xl bg-white/5 hover:bg-red-500/20 text-[#aeaeae] hover:text-red-400 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty State when no chats exist yet */
                <div className="py-16 text-center space-y-4 bg-[#140c1a] rounded-3xl border border-white/5 p-8 max-w-lg mx-auto">
                  <div className="size-16 rounded-full bg-[#f53b70]/20 border border-[#f53b70] flex items-center justify-center mx-auto text-[#f53b70]">
                    <MessageCircle className="size-8" />
                  </div>
                  <h3 className="text-xl font-black text-white">No Conversations Yet</h3>
                  <p className="text-xs text-[#cbb6bf] leading-relaxed">
                    You haven&apos;t started talking to any companion yet. Choose a model below to begin your private chat!
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    {characters.slice(0, 2).map((char) => (
                      <button
                        key={char.id}
                        onClick={() => setActiveChatCharacter(char)}
                        className="flex items-center space-x-2.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
                      >
                        <div className="relative size-10 rounded-xl overflow-hidden shrink-0">
                          <Image src={char.image} alt={char.name} fill className="object-cover" unoptimized />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">{char.name}</span>
                          <span className="text-[10px] text-[#f53b70] font-bold">Start Chat →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW: MY AI (CUSTOM CREATIONS WITH DELETE) ================= */}
          {activeTab === "my-ai" && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <UserCheck className="size-5 text-[#f53b70]" />
                    <h2 className="text-2xl font-black text-white">My AI Companions</h2>
                  </div>
                  <p className="text-xs text-[#aeaeae]">Custom characters designed and personalized by you.</p>
                </div>

                <button
                  onClick={handleOpenCreateCompanion}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white text-xs font-extrabold flex items-center space-x-2 hover:brightness-110 shadow-lg shadow-pink-600/30 transition-all"
                >
                  <PlusCircle className="size-4" />
                  <span>Create New</span>
                </button>
              </div>

              {myAiChars.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {myAiChars.map((character) => (
                    <div key={character.id} className="relative group">
                      <CharacterCard
                        character={character}
                        onSelect={(char) => setSelectedCharacter(char)}
                        onStartChat={handleStartChatWithAuth}
                        isLiked={likedIds.includes(character.id)}
                        onToggleLike={handleToggleLike}
                        isPaidUser={isPaidUser}
                      />

                      {/* Delete Custom Companion Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomCompanion(character.id, character.name);
                        }}
                        title="Delete Companion"
                        className="absolute top-2 right-2 z-20 size-8 rounded-full bg-black/70 hover:bg-red-600 border border-white/20 text-white flex items-center justify-center transition-all shadow-md active:scale-90"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center space-y-4 bg-[#140c1a] rounded-3xl border border-white/5 p-8 max-w-lg mx-auto">
                  <div className="size-16 rounded-full bg-[#f53b70]/20 border border-[#f53b70] flex items-center justify-center mx-auto text-[#f53b70]">
                    <Sparkles className="size-8" />
                  </div>
                  <h3 className="text-xl font-black text-white">No Custom Companions Yet</h3>
                  <p className="text-xs text-[#cbb6bf] leading-relaxed">
                    Build your dream AI partner! Choose their personality, hair color, body type, and voice.
                  </p>
                  <button
                    onClick={handleOpenCreateCompanion}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff5b8c] text-white text-xs font-bold shadow-lg"
                  >
                    Build My First AI Companion
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW: COLLECTION (SAVED FAVORITES) ================= */}
          {activeTab === "collection" && (
            <div className="pt-2">
              <div className="flex items-center space-x-2 mb-2">
                <FolderHeart className="size-5 text-[#f53b70]" />
                <h2 className="text-2xl font-black text-white">My Collection</h2>
              </div>
              <p className="text-xs text-[#aeaeae] mb-6">Your favorite saved AI companions.</p>

              {collectionChars.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {collectionChars.map((character) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      onSelect={(char) => setSelectedCharacter(char)}
                      onStartChat={handleStartChatWithAuth}
                      isLiked={true}
                      onToggleLike={handleToggleLike}
                      isPaidUser={isPaidUser}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center space-y-4 bg-[#140c1a] rounded-3xl border border-white/5 p-8 max-w-lg mx-auto">
                  <Heart className="size-12 text-[#f53b70] mx-auto animate-pulse" />
                  <h3 className="text-xl font-black text-white">Your Collection is Empty</h3>
                  <p className="text-xs text-[#cbb6bf]">
                    Click the heart icon on any companion to save them to your personal VIP collection!
                  </p>
                  <button
                    onClick={() => setActiveTab("discover")}
                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                  >
                    Browse Companions
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW: PRIVATE CONTENT GALLERY ================= */}
          {activeTab === "private" && (
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-[#150d1a] border border-white/10 p-4 rounded-2xl">
                <div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="size-5 text-amber-400" />
                    <h2 className="text-2xl font-black text-white">Private Gallery</h2>
                  </div>
                  <p className="text-xs text-[#aeaeae] mt-1">
                    ✨ All photos requested from your companions are permanently saved and unlocked in full HD.
                  </p>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center space-x-1.5 shrink-0">
                  <Sparkles className="size-3.5" />
                  <span>Permanent HD Unlocked</span>
                </div>
              </div>

              {/* Only show photos that the USER actually requested/generated */}
              {generatedPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-[#130d19] border border-white/10 my-4 shadow-xl">
                  <div className="size-16 rounded-full bg-[#f53b70]/20 border border-[#f53b70]/40 flex items-center justify-center mb-4 shadow-lg shadow-pink-600/20">
                    <Camera className="size-8 text-[#f53b70]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Private Photos Yet</h3>
                  <p className="text-xs text-[#aeaeae] max-w-md mb-6 leading-relaxed">
                    This gallery only shows private photos that you have requested from your companions. Open a chat with any companion and tap <strong className="text-white">&quot;Request Photo 📸&quot;</strong> to unlock your personal gallery!
                  </p>
                  <button
                    onClick={() => setActiveTab("home")}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white text-xs font-bold shadow-lg shadow-pink-500/25 hover:brightness-110 transition-all"
                  >
                    Explore Companions & Request Photos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {generatedPhotos.map((photo, i) => (
                    <div
                      key={photo.id || i}
                      onClick={() => setViewingPhoto(photo)}
                      className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-white/10 cursor-pointer shadow-lg hover:border-[#f53b70]/50 transition-all"
                    >
                      {/* Delete Photo Button */}
                      <button
                        onClick={(e) => handleDeleteGeneratedPhoto(e, photo.id)}
                        title="Delete Photo"
                        className="absolute top-2.5 right-2.5 z-20 size-7 rounded-full bg-black/60 hover:bg-red-600 text-white/80 hover:text-white flex items-center justify-center transition-all backdrop-blur-md shadow-md group/del"
                      >
                        <Trash2 className="size-3.5 group-hover/del:scale-110" />
                      </button>

                      <Image
                        src={photo.photoUrl || photo.url || "/characters/zovik_01.jpg"}
                        alt={photo.characterName || "Private photo"}
                        fill
                        className="object-cover object-top transition-all duration-300 blur-0 group-hover:scale-105"
                        unoptimized
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 opacity-90 group-hover:opacity-100 flex flex-col justify-between p-3 transition-opacity">
                        <div className="flex items-center justify-between pr-8">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                            ✓ HD Photo
                          </span>
                          <span className="text-[10px] text-white/70">
                            {new Date(photo.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-black text-white block">{photo.characterName}</span>
                          <p className="text-[11px] text-[#ddd] line-clamp-1 mt-0.5">{photo.caption}</p>
                          <div className="mt-2 text-[10px] text-pink-400 font-bold flex items-center space-x-1">
                            <Eye className="size-3" />
                            <span>Tap to view full HD →</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === "shorts") {
            setIsShortsOpen(true);
          } else if (tab === "chat") {
            requireAuth(() => setActiveTab(tab), "Apni chats dekhne ke liye pehle sign in karein.");
          } else {
            setActiveTab(tab);
          }
        }}
        openCreateModal={handleOpenCreateCompanion}
        openPremiumModal={() => setIsPremiumOpen(true)}
        unreadCount={activeConversations.length}
      />

      {/* Interactive Modals */}
      {selectedCharacter && (
        <CharacterModal
          character={selectedCharacter}
          isPaidUser={isPaidUser}
          openPremiumModal={() => setIsPremiumOpen(true)}
          onClose={() => setSelectedCharacter(null)}
          onStartChat={(char) => {
            setSelectedCharacter(null);
            handleStartChatWithAuth(char);
          }}
          onDelete={handleDeleteCustomCompanion}
          isLiked={likedIds.includes(selectedCharacter.id)}
          onToggleLike={handleToggleLike}
        />
      )}

      {activeChatCharacter && (
        <ChatModal
          character={activeChatCharacter}
          onClose={() => {
            setActiveChatCharacter(null);
            setChatRefreshTick((t) => t + 1);
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", window.location.pathname);
            }
          }}
          openPremiumModal={() => setIsPremiumOpen(true)}
        />
      )}

      <CreateCharacterModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCharacterCreated={handleCharacterCreated}
      />

      <PremiumModal
        isOpen={isPremiumOpen}
        onClose={() => setIsPremiumOpen(false)}
      />

      <LoginModal
        isOpen={isLoginOpen || authLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setAuthLoginOpen(false);
        }}
      />

      <RouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        characters={characters}
        onSelectCharacter={(char) => {
          setIsRouletteOpen(false);
          handleStartChatWithAuth(char);
        }}
      />

      <ShortsModal
        isOpen={isShortsOpen}
        onClose={() => {
          setIsShortsOpen(false);
          setInitialReelId(null);
        }}
        characters={characters}
        initialReelId={initialReelId}
      />

      <PwaInstallModal
        isOpen={isPwaOpen}
        onClose={() => setIsPwaOpen(false)}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        openPremiumModal={() => setIsPremiumOpen(true)}
      />


      {/* Viewing Photo Modal for VIP/Plus */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setViewingPhoto(null)}
        >
          <div
            className="relative max-w-lg w-full bg-[#140c1a] border border-white/20 rounded-3xl overflow-hidden shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute top-4 right-4 z-20 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden mb-3.5 shadow-lg border border-white/10">
              <Image
                src={viewingPhoto.photoUrl || viewingPhoto.url || "/characters/zovik_01.jpg"}
                alt={viewingPhoto.characterName || "Private photo"}
                fill
                className="object-cover object-top"
                unoptimized
              />
            </div>

            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-lg font-bold text-white">{viewingPhoto.characterName || "Zovik AI"}</h4>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase">
                Permanent HD Photo ✨
              </span>
            </div>
            <p className="text-xs text-[#ccc] mb-4">{viewingPhoto.caption}</p>
            <div className="flex items-center space-x-2 w-full">
              <a
                href={viewingPhoto.photoUrl || viewingPhoto.url || "#"}
                download={`${viewingPhoto.characterName || "exclusive"}_exclusive.jpg`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-2.5 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-white font-bold text-xs shadow-lg shadow-pink-600/30 hover:brightness-110 transition-all"
              >
                Download Full HD Photo
              </a>
              <button
                onClick={(e) => handleDeleteGeneratedPhoto(e, viewingPhoto.id)}
                className="px-3.5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold text-xs flex items-center space-x-1.5 transition-colors"
                title="Delete photo permanently"
              >
                <Trash2 className="size-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option 3: Companion Intimate Floating Banner Toast */}
      <CompanionToast
        onOpenCompanion={(name) => {
          const matched = characters.find(
            (c) => c.name.toLowerCase() === name.toLowerCase()
          );
          if (matched) {
            setSelectedCharacter(matched);
          }
        }}
      />
    </div>
  );
}
