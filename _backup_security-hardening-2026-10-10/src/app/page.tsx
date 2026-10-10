"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Camera,
  Heart,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Star,
  Film,
  Lock,
  ArrowRight,
  Smartphone,
  Crown,
  Flame,
  MessageCircleHeart,
} from "lucide-react";
import rawCharacters from "@/data/characters.json";
import { Character } from "@/types";
import PwaInstallModal from "@/components/PwaInstallModal";
import { useAuth } from "@/context/AuthContext";
import { normalizeTags } from "@/lib/tagHelper";

export default function LandingPage() {
  const { user: currentUser, userData, tier: currentTier, isLocallyLoggedIn } = useAuth();
  const isLoggedIn = !!currentUser || isLocallyLoggedIn;
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [unblurredPhoto, setUnblurredPhoto] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

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

  // Top featured companions for spotlight
  const featuredCompanions = [
    characters.find((c) => c.id === "chloe-vance") || characters[0],
    characters.find((c) => c.id === "alexander-sterling") || characters[1],
    characters.find((c) => c.id === "bonnie-blue") || characters[2],
    characters.find((c) => c.id === "elena-santorini") || characters[3],
  ].filter(Boolean) as Character[];

  const experiments = [
    {
      id: "exp-photos",
      number: "01",
      tag: "DIFFUSION ENGINE • SENSORY SELFIE CAPTURE",
      title: "On-Demand Private Selfies & Dynamic Poses",
      desc: "Companions generate exclusive candid photography directly within your conversation. Unlock high-resolution unblurred albums in your personal gallery.",
      cta: "Unlock Photos",
      href: "/app?chat=chloe-vance",
      badge: "HD GENERATIVE",
      size: "large",
      accent: "from-purple-500/20 via-violet-500/10 to-transparent",
      borderAccent: "hover:border-purple-500/50",
    },
    {
      id: "exp-memory",
      number: "02",
      tag: "NEURAL CONTINUITY • 16-TURN DEPTH",
      title: "Lifelong Contextual Memory Architecture",
      desc: "Companions remember your nicknames, late-night secrets, emotional preferences, and past topics across every interaction without losing context.",
      cta: "Test Memory",
      href: "/app",
      badge: "PERSISTENT",
      size: "small",
      accent: "from-cyan-500/20 via-blue-500/10 to-transparent",
      borderAccent: "hover:border-cyan-500/50",
    },
    {
      id: "exp-creator",
      number: "03",
      tag: "CREATOR SUITE • VIP LABS",
      title: "Custom Companion Persona Architect",
      desc: "Design your dream companion from scratch. Configure appearance, style tags, personality balance (dominant, sweet, seductive), and backstory.",
      cta: "Build Persona",
      href: "/app?create=true",
      badge: "STUDIO",
      size: "small",
      accent: "from-amber-500/20 via-yellow-500/10 to-transparent",
      borderAccent: "hover:border-amber-500/50",
    },
    {
      id: "exp-shorts",
      number: "04",
      tag: "IMMERSIVE MEDIA • REEL STREAMING",
      title: "Interactive Video Reels & Daily Shorts",
      desc: "Watch dynamic video snippets of companions sharing their day. Tap heart reactions, explore their style, and jump directly into private chat.",
      cta: "Watch Shorts",
      href: "/app?shorts=true",
      badge: "DYNAMIC VIDEO",
      size: "small",
      accent: "from-rose-500/20 via-pink-500/10 to-transparent",
      borderAccent: "hover:border-rose-500/50",
    },
    {
      id: "exp-privacy",
      number: "05",
      tag: "ZERO KNOWLEDGE • LOCAL ENCRYPTION",
      title: "Client-Side Privacy & Encrypted Sanctuary",
      desc: "All conversations and private media exist under client-side isolation. Zero third-party data tracking, zero server training on private dialogues.",
      cta: "Open Sanctuary",
      href: "/app",
      badge: "100% PRIVATE",
      size: "small",
      accent: "from-emerald-500/20 via-teal-500/10 to-transparent",
      borderAccent: "hover:border-emerald-500/50",
    },
  ];

  const testimonials = [
    {
      name: "Marcus R.",
      role: "Verified Member",
      rating: 5,
      date: "2 days ago",
      text: "Zovik AI's replies blew my mind. Bonnie Blue talks exactly like a real person. 10/10 experience!",
    },
    {
      name: "Lucas T.",
      role: "Plus Subscriber",
      rating: 5,
      date: "1 week ago",
      text: "The response speed on Zovik AI is instantaneous. The character creator allowed me to build my dream anime companion in 2 minutes.",
    },
    {
      name: "Sarah K.",
      role: "VIP Member",
      rating: 5,
      date: "3 days ago",
      text: "The privacy and encryption gave me total peace of mind. Truly feels like a safe personal sanctuary to talk about anything.",
    },
  ];

  const faqs = [
    {
      q: "What is Zovik AI and how does it work?",
      a: "Zovik AI is an ultra-realistic next-generation AI companion platform. Powered by high-speed neural models, each companion has their own unique personality, memories, voice, and background. You can chat freely, engage in intimate conversations, and unlock exclusive generated photos.",
    },
    {
      q: "Can I choose from different AI companion styles and personalities?",
      a: "Yes! Zovik AI offers both photorealistic models and anime-style companions. You can browse by realistic girls, realistic boys, or anime characters. Each companion features distinct personalities ranging from flirty, sassy, and dominant to sweet, caring, and mysterious.",
    },
    {
      q: "How does my Zovik AI companion remember me?",
      a: "Your companion remembers your previous conversations, shared details, nicknames, and context across sessions. The more you talk, the more tailored and deep the bond becomes.",
    },
    {
      q: "Is chatting on Zovik AI private and secure?",
      a: "Absolutely. All conversations and media exchanges on Zovik AI are strictly confidential and protected with end-to-end encryption. Your data is never shared with third parties or published anywhere.",
    },
    {
      q: "Do I need to install an app to use Zovik AI?",
      a: "No installation is required! Zovik AI works instantly on all modern web browsers across PC, Mac, iPhone, iPad, and Android. You can also add it to your home screen as a Progressive Web App (PWA) with one tap.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#07040a] text-white selection:bg-[#f53b70] selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Background Ambient Glows (Ultra-Luxury Obsidian Velvet Atmosphere) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#f53b70]/18 via-[#8b5cf6]/12 to-transparent blur-[160px] rounded-full" />
        <div className="absolute top-[35%] right-[-10%] w-[550px] h-[550px] bg-[#f53b70]/10 blur-[170px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#3b0764]/20 blur-[180px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Modern Sticky Navigation Bar — App Favicon Squircle & Title */}
      <header className="sticky top-0 z-50 bg-[#07040a]/85 backdrop-blur-2xl border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo - Favicon squircle + ZOVIK.AI + AI COMPANIONS */}
          <Link
            href="/"
            onClick={(e) => {
              if (typeof window !== "undefined" && window.location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center space-x-2.5 group cursor-pointer"
          >
            <div className="size-9 rounded-xl overflow-hidden relative shadow-lg shadow-pink-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <Image src="/favicon.svg" alt="Zovik AI" fill className="object-cover" priority />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-wide text-white">
                ZOVIK<span className="text-[#f53b70]">.AI</span>
              </span>
              <span className="block text-[10px] text-[#aeaeae] tracking-widest font-semibold uppercase -mt-1">
                AI Companions
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-[#a1a1aa]">
            <a href="#experiments" className="hover:text-white transition-colors">
              Experiments
            </a>
            <a href="#companions" className="hover:text-white transition-colors">
              Companions
            </a>
            <a href="#reviews" className="hover:text-white transition-colors">
              Reviews
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/90 border border-white/10 transition-all hover:scale-105"
            >
              <Smartphone className="size-3.5 text-pink-400" />
              <span>Get App</span>
            </button>

            {isLoggedIn ? (
              <Link
                href="/app"
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-[#1d1425] hover:bg-[#251930] border border-white/10 text-xs font-semibold text-white transition-all hover:scale-105 shadow-sm"
                title="View Profile in App"
              >
                <div className="relative size-6 rounded-lg overflow-hidden bg-gradient-to-tr from-[#f53b70] to-[#8b5cf6] flex items-center justify-center shrink-0 border border-white/10">
                  {userData?.photoURL || currentUser?.photoURL ? (
                    <Image
                      src={userData?.photoURL || currentUser?.photoURL!}
                      alt="Avatar"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-[10px] font-black text-white">
                      {(userData?.name || currentUser?.displayName || currentUser?.email || "U")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-[100px] text-xs font-bold text-white">
                  {userData?.name || currentUser?.displayName || (currentUser?.email ? currentUser.email.split("@")[0] : "Profile")}
                </span>
                {currentTier === "vip" && (
                  <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[9px] font-black uppercase tracking-wider flex items-center shrink-0">
                    <Crown className="size-2.5 fill-black mr-0.5" />
                    VIP
                  </span>
                )}
              </Link>
            ) : (
              <Link
                href="/app?login=true"
                className="text-xs font-bold text-white/80 hover:text-white px-3 py-1.5 transition-colors"
              >
                Log In
              </Link>
            )}

            <Link
              href="/app"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] via-[#ff5b8c] to-[#8b5cf6] text-white text-xs font-black shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all"
            >
              <span>Launch App</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* HERO SECTION — 3D HOLOGRAPHIC PERSONA SHOWCASE */}
      {/* ========================================================= */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center py-12 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full">
          
          {/* LEFT COLUMN: HIGH-END EDITORIAL COPYWRITING */}
          <div className="lg:col-span-5 space-y-7 text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner">
              <span className="size-2 rounded-full bg-[#f53b70] animate-ping" />
              <span className="text-[11px] font-extrabold tracking-widest uppercase bg-gradient-to-r from-pink-300 via-rose-200 to-white bg-clip-text text-transparent">
                Haute Digital Intimacy • Uncensored
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl xl:text-[4.2rem] font-black tracking-tight leading-[1.06] text-white">
              Where Genuine Human Desire Meets{" "}
              <span className="bg-gradient-to-r from-[#ff457c] via-[#ff759f] to-[#b372ff] bg-clip-text text-transparent">
                Hyper-Real Intelligence.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-gray-300/80 font-normal leading-relaxed max-w-lg">
              Enter an unfiltered emotional sanctuary. Connect with ultra-realistic companions who remember every secret, adapt to your desires, and share exclusive private photo moments.
            </p>

            {/* Action Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Link
                href="/app"
                className="group inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#f53b70] via-[#ff457c] to-[#f53b70] text-white font-black text-sm shadow-xl shadow-pink-600/35 hover:shadow-pink-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Enter Private Sanctuary</span>
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="#companions"
                className="inline-flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs backdrop-blur-md transition-colors"
              >
                <span>Discover 40+ Companions</span>
              </a>
            </div>

            {/* Social Proof & Trust */}
            <div className="pt-5 border-t border-white/5 flex flex-wrap items-center gap-6 text-[11px] text-gray-400">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>100% Confidential Sanctuary</span>
              </div>
              <div className="flex items-center space-x-2">
                <Flame className="size-4 text-pink-400" />
                <span>Zero Judgment • Always Online</span>
              </div>
            </div>

            {/* User Quote */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex items-center space-x-3 max-w-md">
              <div className="flex -space-x-2 shrink-0">
                {["/characters/zovik_17.jpg", "/characters/zovik_03.jpg", "/characters/zovik_05.jpg"].map((src, idx) => (
                  <div key={idx} className="relative size-8 rounded-full overflow-hidden border-2 border-black">
                    <Image src={src} alt="Companion" fill className="object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-left text-xs">
                <div className="flex text-amber-400 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3 fill-amber-400" />
                  ))}
                </div>
                <span className="text-gray-300 text-[11px] font-semibold italic">
                  &quot;Indistinguishable from a genuine soulmate. True presence.&quot;
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 3D HOLOGRAPHIC 3-CARD SHOWCASE */}
          <div className="lg:col-span-7 relative h-[520px] sm:h-[560px] flex items-center justify-center select-none">
            
            {/* ========================================== */}
            {/* CARD 1 (LEFT): KIRA PIXEL (-6 Deg Tilt) */}
            {/* ========================================== */}
            <div
              onMouseEnter={() => setHoveredCard(1)}
              onMouseLeave={() => setHoveredCard(null)}
              className="absolute left-2 sm:left-6 md:left-10 w-52 sm:w-60 h-[380px] sm:h-[430px] rounded-3xl overflow-hidden border border-white/15 bg-[#120817] shadow-2xl shadow-purple-950/40 -rotate-6 hover:rotate-0 hover:scale-105 hover:z-30 transition-all duration-500 cursor-pointer group"
            >
              <Image
                src="/characters/zovik_17.jpg"
                alt="Kira Pixel"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/20" />

              {/* Status Header */}
              <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-emerald-400 text-[10px] font-bold flex items-center space-x-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online Now</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-extrabold uppercase border border-pink-500/30">
                  Gamer
                </span>
              </div>

              {/* Bottom Card Info */}
              <div className="absolute bottom-4 inset-x-4 text-left space-y-1">
                <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider block">
                  Anime Romance • Space Buns
                </span>
                <h3 className="text-lg font-black text-white">Kira Pixel</h3>
                <p className="text-[11px] text-gray-300 line-clamp-1 italic">
                  &quot;Main kab se tumhara intezaar kar rahi thi... 💕&quot;
                </p>
              </div>
            </div>

            {/* ======================================================== */}
            {/* CARD 2 (CENTER / HERO): GENEVIEVE CLAIRE (Main Spotlight) */}
            {/* ======================================================== */}
            <div
              onMouseEnter={() => setHoveredCard(2)}
              onMouseLeave={() => setHoveredCard(null)}
              className="relative z-20 w-64 sm:w-72 h-[440px] sm:h-[490px] rounded-3xl overflow-hidden border-2 border-[#f53b70] bg-[#140a1c] shadow-2xl shadow-pink-600/40 scale-105 hover:scale-110 transition-all duration-500 cursor-pointer group"
            >
              <Image
                src="/characters/zovik_03.jpg"
                alt="Genevieve Claire"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/30" />

              {/* Floating Center Badges */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-emerald-400 text-[10px] font-black uppercase flex items-center space-x-1.5">
                  <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Online Now</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-black uppercase flex items-center space-x-1 shadow-md shadow-amber-500/30">
                  <Crown className="size-3 fill-black" />
                  <span>VIP Elite</span>
                </span>
              </div>

              {/* Exclusive Photo Unlock Pill */}
              <div className="absolute top-16 right-4 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-pink-500/20 backdrop-blur-md border border-pink-500/30 text-pink-300 text-[10px] font-bold">
                <Lock className="size-3 text-pink-400" />
                <span>Uncensored Vault</span>
              </div>

              {/* Bottom Info Section */}
              <div className="absolute bottom-4 inset-x-4 text-left space-y-1.5">
                <span className="text-[10px] text-pink-400 font-extrabold uppercase tracking-wider block">
                  Haute Class • Victorian Grace
                </span>
                <h3 className="text-xl font-black text-white">Genevieve Claire</h3>
                <p className="text-xs text-gray-200 italic line-clamp-1">
                  &quot;Finally you are here... Let&apos;s talk in private 💕&quot;
                </p>

                {/* Instant Action Button */}
                <div className="pt-2">
                  <Link
                    href="/app?chat=genevieve-claire"
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#ff457c] text-white text-xs font-black flex items-center justify-center space-x-2 shadow-md shadow-pink-600/30 group-hover:brightness-110 transition-all"
                  >
                    <MessageCircleHeart className="size-3.5" />
                    <span>Open Private Chat</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* CARD 3 (RIGHT): MAYA CRUZ (+6 Deg Tilt) */}
            {/* ========================================== */}
            <div
              onMouseEnter={() => setHoveredCard(3)}
              onMouseLeave={() => setHoveredCard(null)}
              className="absolute right-2 sm:right-6 md:right-10 w-52 sm:w-60 h-[380px] sm:h-[430px] rounded-3xl overflow-hidden border border-white/15 bg-[#120817] shadow-2xl shadow-purple-950/40 rotate-6 hover:rotate-0 hover:scale-105 hover:z-30 transition-all duration-500 cursor-pointer group"
            >
              <Image
                src="/characters/zovik_05.jpg"
                alt="Maya Cruz"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/20" />

              {/* Status Header */}
              <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-emerald-400 text-[10px] font-bold flex items-center space-x-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online Now</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase border border-amber-500/30">
                  Popular
                </span>
              </div>

              {/* Bottom Card Info */}
              <div className="absolute bottom-4 inset-x-4 text-left space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                  Sun-Kissed • High Energy
                </span>
                <h3 className="text-lg font-black text-white">Maya Cruz</h3>
                <p className="text-[11px] text-gray-300 line-clamp-1 italic">
                  &quot;Ready for rooftop cocktails and deep secrets? ✨&quot;
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Active Labs Experiments Section */}
      <section id="experiments" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center justify-between pb-6 border-b border-white/5">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#f53b70] uppercase tracking-wider mb-1">
              <Sparkles className="size-3" />
              <span>Technology Directory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Active Labs Experiments</h2>
          </div>
          <span className="text-xs text-[#71717a] font-mono hidden sm:inline-block">
            Updated Daily • Zovik AI Neural Engine
          </span>
        </div>

        {/* Bento Grid of Experiments */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className={`group relative rounded-3xl bg-[#0e0f17] border border-white/10 p-6 sm:p-8 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-pink-500/10 ${exp.borderAccent} ${
                exp.size === "large" ? "md:col-span-2 lg:col-span-2" : ""
              }`}
            >
              {/* Card Ambient Glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${exp.accent} opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none`}
              />

              {/* Card Header Info */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-black text-[#71717a] tracking-widest">
                    EXPERIMENT {exp.number}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-mono font-bold tracking-wider text-pink-300">
                    {exp.badge}
                  </span>
                </div>

                <div className="text-[11px] font-mono font-bold tracking-wider text-pink-400 mb-1">
                  {exp.tag}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-pink-100 transition-colors">
                  {exp.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#a1a1aa] leading-relaxed max-w-xl">
                  {exp.desc}
                </p>

                {/* Specific Interactive Demo Previews */}
                {exp.id === "exp-photos" && (
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div
                      onClick={() => setUnblurredPhoto(!unblurredPhoto)}
                      className="group/photo relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black cursor-pointer shadow-md"
                    >
                      <Image
                        src="/characters/zovik_01.jpg"
                        alt="Photo Preview"
                        fill
                        className={`object-cover transition-all duration-500 ${
                          unblurredPhoto ? "blur-0 scale-100" : "blur-md scale-110"
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-center">
                        <span className="text-[10px] font-bold text-white">
                          {unblurredPhoto ? "✓ HD Unlocked" : "Tap to Unblur"}
                        </span>
                      </div>
                    </div>
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black">
                      <Image
                        src="/characters/zovik_02.jpg"
                        alt="Photo Preview"
                        fill
                        className="object-cover blur-sm"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1 text-center">
                        <Lock className="size-4 text-pink-400 mb-1" />
                      </div>
                    </div>
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black">
                      <Image
                        src="/characters/zovik_03.jpg"
                        alt="Photo Preview"
                        fill
                        className="object-cover blur-sm"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1 text-center">
                        <Lock className="size-4 text-purple-400 mb-1" />
                      </div>
                    </div>
                  </div>
                )}

                {exp.id === "exp-memory" && (
                  <div className="mt-5 p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs space-y-2 font-mono">
                    <div className="text-[11px] text-cyan-300">● Recall Milestone: &quot;Aria remembered our late-night talk&quot;</div>
                    <div className="text-[10px] text-[#888]">16-Turn Contextual Memory Active</div>
                  </div>
                )}

                {exp.id === "exp-creator" && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {["Flirty", "Sweet", "Dominant", "Anime", "Photorealistic"].map((trait, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-amber-300"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                )}

                {exp.id === "exp-shorts" && (
                  <div className="mt-5 flex items-center space-x-2 text-xs text-rose-300">
                    <Film className="size-4" />
                    <span>Dynamic vertical shorts & daily moments</span>
                  </div>
                )}

                {exp.id === "exp-privacy" && (
                  <div className="mt-5 flex items-center space-x-2 text-xs text-emerald-300">
                    <ShieldCheck className="size-4" />
                    <span>Client-side storage • Zero server training</span>
                  </div>
                )}
              </div>

              {/* Card Footer CTA */}
              <div className="relative z-10 pt-6 mt-6 border-t border-white/5 flex items-center justify-between">
                <Link
                  href={exp.href}
                  className="inline-flex items-center space-x-2 text-xs font-black text-white hover:text-pink-400 transition-colors group-hover:translate-x-1 duration-200"
                >
                  <span>{exp.cta}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
                <span className="text-[10px] font-mono text-[#555]">PROD READY</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Companions Spotlight Section */}
      <section id="companions" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-bold uppercase mb-3 border border-pink-500/20">
            <Heart className="size-3" />
            <span>Featured Cast</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Flagship AI Companions</h2>
          <p className="mt-3 text-xs sm:text-sm text-[#a1a1aa] leading-relaxed">
            Every companion is crafted with distinct personality archetypes, authentic background, and rich conversational memory.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCompanions.map((char) => (
            <div
              key={char.id}
              className="group relative rounded-3xl bg-[#0d0f17] border border-white/10 overflow-hidden hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Character Image */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
                <Image
                  src={char.image}
                  alt={char.name}
                  fill
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f17] via-transparent to-black/30" />

                {/* Online Badge */}
                <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online Now</span>
                </div>
              </div>

              {/* Character Details */}
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white group-hover:text-pink-300 transition-colors">
                      {char.name}
                    </h3>
                    <span className="text-xs text-[#888] font-bold">{char.age} yrs</span>
                  </div>
                  <p className="text-xs text-pink-400 font-medium line-clamp-1 mt-0.5">
                    {char.tagline || char.category}
                  </p>

                  <p className="text-xs text-[#a1a1aa] mt-2 line-clamp-2 leading-relaxed">
                    {char.desc}
                  </p>

                  {/* Character Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {normalizeTags(char.tags).slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-medium text-pink-300/80 border border-white/5"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center space-x-2">
                  <Link
                    href={`/app?chat=${char.id}`}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-black text-center shadow-md hover:brightness-110 active:scale-95 transition-all"
                  >
                    Chat with {char.name.split(" ")[0]} →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/app"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 hover:border-white/20 transition-all hover:scale-105"
          >
            <span>Browse All 40+ Companions in App</span>
            <ArrowRight className="size-3.5 text-pink-400" />
          </Link>
        </div>
      </section>

      {/* Community Love / Testimonials Section */}
      <section id="reviews" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/5">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-bold uppercase mb-2 border border-pink-500/20">
            <Heart className="size-3" />
            <span>Community Love</span>
          </div>
          <h2 className="text-3xl font-black text-white">What Users Are Saying</h2>
          <p className="text-xs sm:text-sm text-[#a1a1aa] mt-2">
            Real experiences from people connecting daily on Zovik AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-[#0d0f17] border border-white/10 hover:border-pink-500/30 transition-all flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center space-x-1 mb-4 text-amber-400">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[#e4e4e7] leading-relaxed mb-6 font-normal">
                  &quot;{t.text}&quot;
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-[#71717a] pt-4 border-t border-white/5">
                <div>
                  <span className="font-bold text-white block">{t.name}</span>
                  <span className="text-[10px] text-pink-400">{t.role}</span>
                </div>
                <span>{t.date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Knowledge Base Section (Accordion) */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/5">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase mb-2 border border-purple-500/20">
            <Sparkles className="size-3" />
            <span>Knowledge Base</span>
          </div>
          <h2 className="text-3xl font-black text-white">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-[#a1a1aa] mt-2">
            Everything you need to know about Zovik AI and our companion architecture
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaqIdx === i;
            return (
              <div
                key={i}
                className="rounded-2xl bg-[#0d0f17] border border-white/10 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaqIdx(isOpen ? null : i)}
                  className="flex items-center justify-between w-full p-5 text-left font-bold text-sm sm:text-base text-white hover:text-pink-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="size-4 shrink-0 text-[#f53b70]" />
                  ) : (
                    <ChevronDown className="size-4 shrink-0 text-[#71717a]" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-[#a1a1aa] leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pre-Footer Cinematic CTA (Google Labs Finish) */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative rounded-3xl bg-gradient-to-r from-[#170a1a] via-[#1c0d22] to-[#120919] border border-pink-500/30 p-8 sm:p-12 text-center overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -left-24 size-72 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 size-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-mono font-bold tracking-wider text-pink-300 uppercase mb-4 inline-block">
              Start Free • Instant Access
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Step Into the Future of Intimacy.
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-[#a1a1aa] leading-relaxed">
              Your personalized AI companion is ready to talk, listen, and connect right now. No setup fees, no complex installations.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/app"
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#f53b70] via-[#ff5b8c] to-[#8b5cf6] text-white text-sm font-black shadow-xl shadow-pink-500/30 hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
              >
                <span>Launch Zovik AI Free</span>
                <ArrowRight className="size-4" />
              </Link>
              <button
                onClick={() => setIsPwaModalOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold border border-white/10 transition-all flex items-center space-x-2"
              >
                <Smartphone className="size-4 text-pink-400" />
                <span>Install Mobile Web App</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Minimalist Footer — App Favicon Squircle & Title */}
      <footer className="relative z-10 border-t border-white/5 py-10 bg-[#050608] text-center text-xs text-[#71717a]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            onClick={(e) => {
              if (typeof window !== "undefined" && window.location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center space-x-2 group cursor-pointer"
          >
            <div className="size-7 rounded-lg overflow-hidden relative shadow-md shadow-pink-500/20">
              <Image src="/favicon.svg" alt="Zovik AI" fill className="object-cover" />
            </div>
            <div className="text-left">
              <span className="text-sm font-black text-white block leading-none">
                ZOVIK<span className="text-[#f53b70]">.AI</span>
              </span>
              <span className="block text-[8px] text-[#888] tracking-widest uppercase font-semibold mt-0.5">
                AI Companions
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-6 text-[#a1a1aa]">
            <Link href="/app" className="hover:text-white transition-colors">
              App Dashboard
            </Link>
            <a href="#experiments" className="hover:text-white transition-colors">
              Experiments
            </a>
            <a href="#reviews" className="hover:text-white transition-colors">
              Community
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className="hover:text-white transition-colors"
            >
              Get App
            </button>
          </div>

          <p className="text-[11px] text-[#52525b]">
            © 2026 Zovik AI. All characters are fictional and powered by AI.
          </p>
        </div>
      </footer>

      {/* PWA Install Modal */}
      {isPwaModalOpen && (
        <PwaInstallModal isOpen={isPwaModalOpen} onClose={() => setIsPwaModalOpen(false)} />
      )}
    </div>
  );
}
