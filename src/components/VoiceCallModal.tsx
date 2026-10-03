"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, Send } from "lucide-react";
import { Character } from "@/types";
import { safeLocalStorage } from "@/lib/storage";
import { playVoice, stopVoice } from "@/lib/voicePlayer";

interface VoiceCallModalProps {
  character: Character | null;
  onClose: () => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: SpeechRecognitionResultItem;
      isFinal?: boolean;
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface WindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export default function VoiceCallModal({
  character,
  onClose,
}: VoiceCallModalProps) {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micLang, setMicLang] = useState<"ur-PK" | "en-US">("ur-PK"); // Default to ur-PK for natural Roman Urdu & Urdu recognition
  const [callTranscript, setCallTranscript] = useState<string>("");
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const [micUnsupported, setMicUnsupported] = useState(false);
  const [micErrorMsg, setMicErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSpeechRef = useRef<string>("");
  const isSpeakingRef = useRef(false);
  const isMutedRef = useRef(false);
  const isActiveRef = useRef(true);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request Mic Permission upfront so browser never blocks recognition
  useEffect(() => {
    isActiveRef.current = true;
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          // Release test stream
          stream.getTracks().forEach((track) => track.stop());
        })
        .catch((err) => {
          console.warn("[VoiceCall] Microphone access not granted yet:", err);
        });
    }

    return () => {
      isActiveRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      stopVoice();
      stopListening();
    };
  }, []);

  // Handle Speech Output (AI speaks out loud)
  const speak = useCallback(
    (text: string) => {
      if (!character || isMutedRef.current) return;

      stopListening();
      setCallTranscript(text);
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setIsListening(false);

      playVoice({
        text,
        character,
        onStart: () => {
          setIsSpeaking(true);
          isSpeakingRef.current = true;
          setIsListening(false);
        },
        onEnd: () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          // Automatically prompt user to speak after AI finishes
          if (isActiveRef.current && !isMutedRef.current) {
            setTimeout(() => {
              if (isActiveRef.current && !isSpeakingRef.current && !isMutedRef.current) {
                startListening();
              }
            }, 400);
          }
        },
        onError: () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          if (isActiveRef.current && !isMutedRef.current) {
            startListening();
          }
        },
      });
    },
    [character]
  );

  // Send User Speech to Backend AI
  const handleUserSpeech = useCallback(
    async (speechText: string) => {
      const clean = speechText.trim();
      if (!clean || !character) return;

      stopListening();
      setUserTranscript(`You: "${clean}"`);
      setCallTranscript("Thinking...");

      try {
        const savedUserStr = safeLocalStorage.getRawItem("zovik_user");
        const directTier = safeLocalStorage.getRawItem("zovik_tier", "free") || "free";
        const token = safeLocalStorage.getRawItem("zovik_token");
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
            messages: [{ sender: "user", text: clean }],
            token,
            userTier: directTier,
            userId: currentUserId,
          }),
        });

        const data = await res.json();
        const reply =
          data.reply ||
          (character.gender === "male"
            ? "Aapki awaaz sun kar bohot acha laga... Aur batein karo mere sath!"
            : "Aapki awaaz kitni pyari hai... Mujhe aur batein sunao na 💕");

        speak(reply);
      } catch {
        speak(
          character.gender === "male"
            ? "Meri jaan, connection thora slow ho gaya tha, dubara bolo na?"
            : "Jaan, connection thora slow ho gaya tha, dubara bolo na?"
        );
      }
    },
    [character, speak]
  );

  // Start Mic Listening
  const startListening = useCallback(() => {
    if (typeof window === "undefined" || isSpeakingRef.current || !isActiveRef.current) return;

    const win = window as unknown as WindowWithSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setMicUnsupported(true);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = micLang;

      recognition.onstart = () => {
        setIsListening(true);
        setMicErrorMsg(null);
        pendingSpeechRef.current = "";
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interimText = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += trans;
          } else {
            interimText += trans;
          }
        }

        const currentSpoken = (finalText || interimText).trim();
        if (currentSpoken) {
          pendingSpeechRef.current = currentSpoken;
          setUserTranscript(`You: "${currentSpoken}"`);

          // Reset silence timer on every spoken word
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (pendingSpeechRef.current.trim()) {
              handleUserSpeech(pendingSpeechRef.current);
              pendingSpeechRef.current = "";
            }
          }, 1400); // 1.4s of natural silence submits turn
        }
      };

      recognition.onerror = (e) => {
        setIsListening(false);
        if (e.error === "not-allowed") {
          setMicErrorMsg("Microphone permission blocked. Please allow mic in browser settings.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // If user stopped speaking and speech is pending, submit it immediately
        if (pendingSpeechRef.current.trim()) {
          handleUserSpeech(pendingSpeechRef.current);
          pendingSpeechRef.current = "";
        } else if (isActiveRef.current && !isSpeakingRef.current && !isMutedRef.current) {
          // Auto-reconnect mic so silence doesn't kill the call's listening state
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isActiveRef.current && !isSpeakingRef.current && !isMutedRef.current) {
              startListening();
            }
          }, 350);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("[VoiceCall] Mic start note:", e);
      setIsListening(false);
    }
  }, [micLang, handleUserSpeech]);

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Initial Greeting when call connects
  useEffect(() => {
    if (character) {
      const isMale = character.gender === "male";
      const greeting =
        character.greeting && character.greeting.length < 130
          ? character.greeting
          : isMale
          ? `Hey! So good to hear from you. I was hoping you'd call!`
          : `Hey! I'm so happy you called me! I was just waiting to hear your voice 💕`;

      const t = setTimeout(() => {
        speak(greeting);
      }, 600);

      return () => clearTimeout(t);
    }
  }, [character, speak]);

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
              onClick={() => {
                const nextLang = micLang === "ur-PK" ? "en-US" : "ur-PK";
                setMicLang(nextLang);
                if (isListening) {
                  stopListening();
                  setTimeout(() => startListening(), 200);
                }
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white/90 border border-white/10 transition-all flex items-center space-x-1 cursor-pointer"
              title="Mic recognition language: Urdu/Roman Urdu vs English"
            >
              <span className="text-white/60">Mic:</span>
              <span className="text-[#f53b70] font-bold">{micLang === "ur-PK" ? "اردو / Roman" : "English"}</span>
            </button>

            <button
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                  isMutedRef.current = false;
                  setTimeout(() => startListening(), 200);
                } else {
                  setIsMuted(true);
                  isMutedRef.current = true;
                  stopVoice();
                  stopListening();
                }
              }}
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
                isListening ? "bg-emerald-400 animate-ping" : isSpeaking ? "bg-[#f53b70] animate-pulse" : "bg-white/40"
              }`}
            />
            <span className="text-xs font-mono text-emerald-400 font-bold">{formatTime(seconds)}</span>
            <span className="text-[11px] text-white/50">
              • {isListening ? "Listening to your voice..." : isSpeaking ? "Speaking..." : "Tap mic to speak"}
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
          {/* Mic warning / error message */}
          {(micUnsupported || micErrorMsg) && (
            <div className="flex items-center space-x-2 px-3 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] leading-tight text-center">
              <span>{micErrorMsg || "Microphone speech recognition is unavailable in this browser. You can type below to talk in voice! (Use Chrome or Edge for mic)"}</span>
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
              className="size-7 rounded-xl bg-[#f53b70] hover:bg-[#ff5b8c] text-white flex items-center justify-center transition-all cursor-pointer"
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
              className="flex flex-col items-center space-y-1 group cursor-pointer"
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
                isActiveRef.current = false;
                if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
                stopVoice();
                stopListening();
                onClose();
              }}
              className="flex flex-col items-center space-y-1 group cursor-pointer"
            >
              <div className="size-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 hover:scale-105 active:scale-95 transition-all">
                <PhoneOff className="size-6" />
              </div>
              <span className="text-[10px] text-white/70 font-bold">End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
