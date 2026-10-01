"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, Send } from "lucide-react";
import { Character } from "@/types";

interface VoiceCallModalProps {
  character: Character | null;
  onClose: () => void;
}

export default function VoiceCallModal({
  character,
  onClose,
}: VoiceCallModalProps) {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micLang, setMicLang] = useState<"en-US" | "ur-PK">("en-US");
  const [callTranscript, setCallTranscript] = useState<string>("");
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const [micUnsupported, setMicUnsupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Voice synthesis with multilingual and feminine/masculine selection
  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || isMuted) return;

    window.speechSynthesis.cancel();
    setCallTranscript(text);
    setIsSpeaking(true);
    setIsListening(false);

    // Keep all Unicode letters (Urdu, Arabic, English, accents), numbers and common punctuation
    const clean = text.replace(/[^\p{L}\p{N}\s.,?!'’\-]/gu, "").trim();
    if (!clean) {
      setIsSpeaking(false);
      startListening();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    const isUrduScript = /[\u0600-\u06FF]/.test(clean);

    if (isUrduScript) {
      utterance.lang = "ur-PK";
    } else {
      utterance.lang = "en-US";
    }

    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const isFemale = character?.gender !== "male";

      if (isUrduScript) {
        const urduVoice = voices.find((v) => v.lang.startsWith("ur") || v.lang.startsWith("hi"));
        if (urduVoice) {
          utterance.voice = urduVoice;
          return;
        }
      }

      if (isFemale) {
        // High priority female voice names across Windows, Mac, Chrome, Edge, Android
        const femaleVoice = voices.find(
          (v) =>
            v.name.includes("Zira") ||
            v.name.includes("Female") ||
            v.name.includes("Jenny") ||
            v.name.includes("Samantha") ||
            v.name.includes("Victoria") ||
            v.name.includes("Google UK English Female") ||
            (v.name.includes("English") && !v.name.includes("David") && !v.name.includes("Male") && !v.name.includes("George"))
        );
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }
        utterance.pitch = 1.25; // Feminine pitch boost
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

    utterance.rate = 0.96;

    utterance.onend = () => {
      setIsSpeaking(false);
      // Automatically resume mic listening after AI finishes speaking
      startListening();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      startListening();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Web Speech Recognition for Real User Mic Input
  const startListening = () => {
    if (typeof window === "undefined" || isSpeaking) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicUnsupported(true);
      console.warn("SpeechRecognition not supported in this browser");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = micLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentText = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentText += event.results[i][0].transcript;
        }
        setUserTranscript(currentText);

        if (event.results[0].isFinal) {
          handleUserSpeech(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("Mic speech error:", e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleUserSpeech = async (speechText: string) => {
    if (!speechText.trim() || !character) return;
    stopListening();
    setUserTranscript(`You: "${speechText}"`);
    setCallTranscript("Thinking...");

    try {
      const savedUserStr = typeof window !== "undefined" ? localStorage.getItem("zovik_user") : null;
      const directTier = typeof window !== "undefined" ? localStorage.getItem("zovik_tier") || "free" : "free";
      const token = typeof window !== "undefined" ? localStorage.getItem("zovik_token") : null;
      let currentUserId: string | undefined;
      try {
        if (savedUserStr) currentUserId = JSON.parse(savedUserStr)?.id;
      } catch {}

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          character,
          messages: [{ sender: "user", text: speechText }],
          token,
          userTier: directTier,
          userId: currentUserId,
        }),
      });
      const data = await res.json();
      const reply = data.reply || "Aapki awaaz kitni pyari hai... Mujhe aur batein sunao na 💕";
      speak(reply);
    } catch {
      speak("Jaan, aapki baat sun kar bohot maza aaya. Thori aur batein karo mere sath!");
    }
  };

  // Initial Greeting when call connects: dynamic and tailored to character
  useEffect(() => {
    if (character) {
      const isMale = character.gender === "male";
      const greeting =
        character.greeting && character.greeting.length < 130
          ? character.greeting
          : isMale
          ? `Hey! So good to hear from you. I was hoping you'd call!`
          : `Hey! I'm so happy you called me! I was just waiting to hear your voice 💕`;

      setTimeout(() => {
        speak(greeting);
      }, 700);
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [character]);

  if (!character) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn">
      <div className="relative flex flex-col items-center justify-between w-full max-w-md h-[92vh] max-h-[640px] rounded-3xl bg-gradient-to-b from-[#1f112b] via-[#140a1c] to-[#09040c] border border-white/10 p-5 md:p-6 shadow-2xl overflow-hidden text-center">
        {/* Top Header Badge & Language Toggle */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#f53b70]/20 border border-[#f53b70]/30 text-[#f53b70] text-xs font-bold">
            <Sparkles className="size-3" />
            <span>Live HD Voice Call</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mic Language Switcher */}
            <button
              type="button"
              onClick={() => setMicLang((prev) => (prev === "en-US" ? "ur-PK" : "en-US"))}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white/90 border border-white/10 transition-all flex items-center space-x-1 cursor-pointer"
              title="Mic language switch: English/Roman Urdu or Urdu"
            >
              <span className="text-white/60">Mic:</span>
              <span className="text-[#f53b70] font-bold">{micLang === "en-US" ? "EN / Roman" : "اردو"}</span>
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </div>

        {/* Center Character Avatar with Interactive Audio Pulse */}
        <div className="relative flex flex-col items-center justify-center my-auto w-full">
          {/* Animated Glow Rings when AI is speaking */}
          {isSpeaking && (
            <>
              <div className="absolute size-44 rounded-full bg-[#f53b70]/30 animate-ping" />
              <div className="absolute size-36 rounded-full bg-[#8b5cf6]/40 animate-pulse" />
            </>
          )}

          {/* Pulsing ring when user is talking into Mic */}
          {isListening && (
            <div className="absolute size-40 rounded-full border-2 border-emerald-400/60 animate-ping" />
          )}

          <div className="relative size-28 sm:size-32 rounded-full overflow-hidden border-2 border-[#f53b70] shadow-2xl shadow-pink-600/50">
            <Image
              src={character.image}
              alt={character.name}
              fill
              className="object-cover object-top"
              unoptimized
            />
          </div>

          <h3 className="text-2xl font-black text-white mt-3">{character.name}</h3>
          <p className="text-xs text-[#cbb6bf]">{character.voice}</p>

          {/* Connected Timer & Status */}
          <div className="flex items-center space-x-2 mt-1.5">
            <span
              className={`size-2 rounded-full ${
                isListening ? "bg-emerald-400 animate-ping" : "bg-[#f53b70] animate-pulse"
              }`}
            />
            <span className="text-xs font-mono text-emerald-400 font-bold">{formatTime(seconds)}</span>
            <span className="text-[11px] text-white/50">
              • {isListening ? "Listening to you..." : isSpeaking ? "Speaking..." : "Connected"}
            </span>
          </div>

          {/* Live Transcript Bubble */}
          <div className="mt-3 px-4 py-2.5 rounded-2xl bg-black/60 border border-white/10 text-xs text-[#f1e6ed] max-w-xs line-clamp-3 shadow-inner">
            {isSpeaking
              ? `"${callTranscript}"`
              : userTranscript
              ? userTranscript
              : isListening
              ? "🎙️ Bolna shuru karein, main sun rahi hoon..."
              : `"${callTranscript}"`}
          </div>

          {/* Audio Waveform Bars */}
          <div className="flex items-center space-x-1.5 mt-3 h-7">
            {[8, 22, 14, 30, 26, 12, 24, 32, 16, 10, 20, 28].map((h, i) => (
              <span
                key={i}
                style={{
                  height: isSpeaking || isListening ? `${h}px` : "4px",
                }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isSpeaking
                    ? "bg-gradient-to-t from-[#f53b70] to-[#ff5b8c]"
                    : isListening
                    ? "bg-emerald-400"
                    : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Interactive Mic & Quick Type Bar */}
        <div className="w-full flex flex-col space-y-3 pt-2">
          {/* Browser mic compatibility alert */}
          {micUnsupported && (
            <div className="flex items-center space-x-2 px-3 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] leading-tight text-center">
              <span>⚠️ Microphone recognition is unavailable in this browser. You can type below to talk in voice! (Use Chrome or Edge for mic)</span>
            </div>
          )}

          {/* Text input fallback so user can type or talk */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputText.trim()) {
                handleUserSpeech(inputText.trim());
                setInputText("");
              }
            }}
            className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-2xl px-3 py-1.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message or speak into mic..."
              className="flex-1 bg-transparent text-xs text-white placeholder-white/40 outline-none"
            />
            <button
              type="submit"
              className="size-7 rounded-xl bg-[#f53b70] hover:bg-[#ff5b8c] text-white flex items-center justify-center transition-all"
            >
              <Send className="size-3.5" />
            </button>
          </form>

          {/* Action Call Controls: Mic Toggle & End Call */}
          <div className="flex items-center justify-center space-x-6">
            {/* Live Mic Toggle Button */}
            <button
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              className={`flex flex-col items-center space-y-1 group`}
            >
              <div
                className={`size-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isListening
                    ? "bg-emerald-500 text-white shadow-emerald-500/50 scale-110 animate-pulse"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {isListening ? <Mic className="size-6" /> : <MicOff className="size-6" />}
              </div>
              <span className="text-[10px] text-white/70 font-bold">
                {isListening ? "Listening..." : "Tap to Speak"}
              </span>
            </button>

            {/* End Call Button */}
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
                stopListening();
                onClose();
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="size-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-all hover:scale-105 active:scale-95">
                <PhoneOff className="size-6" />
              </div>
              <span className="text-[10px] text-red-400 font-bold">End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
