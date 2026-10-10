"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Video,
  VideoOff,
  Camera,
  CameraOff,
  PhoneCall,
  Crown,
  Loader2,
  Languages,
} from "lucide-react";
import { Character, Message } from "@/types";
import { safeLocalStorage } from "@/lib/storage";
import { playVoice, stopVoice } from "@/lib/voicePlayer";
import { getSafeStreamUrl } from "@/lib/videoHelper";

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

/**
 * Safe helper to close AudioContext without throwing InvalidStateError
 */
function safeCloseAudioContext(ctx: AudioContext | null): void {
  if (!ctx) return;
  try {
    if (ctx.state !== "closed") {
      ctx.close().catch(() => {});
    }
  } catch {}
}

/**
 * Safe Outgoing Ringtone generator using Web Audio API
 * Guaranteed to never throw "Cannot close a closed AudioContext"
 */
function startDialTone(): () => void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return () => {};

    let ctx: AudioContext | null = new AudioCtx();
    let isStopped = false;
    let timerId: NodeJS.Timeout | null = null;

    const playBurst = () => {
      if (isStopped || !ctx || ctx.state === "closed") return;
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        gain.gain.setValueAtTime(0.035, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.2);
        osc2.stop(ctx.currentTime + 1.2);

        timerId = setTimeout(() => {
          if (!isStopped) playBurst();
        }, 2200);
      } catch {}
    };

    playBurst();

    return () => {
      if (isStopped) return;
      isStopped = true;
      if (timerId) clearTimeout(timerId);
      if (ctx) {
        safeCloseAudioContext(ctx);
        ctx = null;
      }
    };
  } catch {
    return () => {};
  }
}

export default function VoiceCallModal({
  character,
  onClose,
}: VoiceCallModalProps) {
  const [callStatus, setCallStatus] = useState<"calling" | "connected">("calling");
  const [callMode, setCallMode] = useState<"video" | "voice">(
    character?.videoUrl ? "video" : "voice"
  );
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 1
  const [userStream, setUserStream] = useState<MediaStream | null>(null);

  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Defaults to "en-US" so subtitles are written in clean English/Roman letters
  const [micLang, setMicLang] = useState<"en-US" | "ur-PK">("en-US");

  useEffect(() => {
    const saved = safeLocalStorage.getRawItem("zovik_call_mic_lang");
    if (saved === "ur-PK" || saved === "en-US") {
      setMicLang(saved);
    }
  }, []);

  const [callTranscript, setCallTranscript] = useState<string>("");
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const [micUnsupported, setMicUnsupported] = useState(false);
  const [micErrorMsg, setMicErrorMsg] = useState<string | null>(null);

  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSpeechRef = useRef<string>("");

  const isSpeakingRef = useRef(false);
  const isAiBusyRef = useRef(false); // TRUE while AI is fetching/thinking OR speaking
  const aiTurnWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const isMutedRef = useRef(false);
  const isActiveRef = useRef(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Timer: Runs only when call is connected
  useEffect(() => {
    if (callStatus !== "connected") return;
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  // Request Mic Permission and Setup Live Audio Analyser
  useEffect(() => {
    isActiveRef.current = true;
    let micStream: MediaStream | null = null;

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          micStream = stream;

          // Setup real-time Web Audio API frequency analyser
          try {
            const AudioCtx =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const source = ctx.createMediaStreamSource(stream);
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 64;
              analyser.smoothingTimeConstant = 0.6;
              source.connect(analyser);

              audioCtxRef.current = ctx;
              analyserRef.current = analyser;

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const updateLevel = () => {
                if (!analyserRef.current || !isActiveRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const normalized = Math.min(1, avg / 70);
                setAudioLevel(normalized);
                animFrameRef.current = requestAnimationFrame(updateLevel);
              };
              animFrameRef.current = requestAnimationFrame(updateLevel);
            }
          } catch (err) {
            console.warn("Analyser init error:", err);
          }
        })
        .catch((err) => {
          console.warn("[VoiceCall] Microphone access not granted yet:", err);
        });
    }

    return () => {
      isActiveRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioCtxRef.current) {
        safeCloseAudioContext(audioCtxRef.current);
        audioCtxRef.current = null;
      }
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
      }
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (aiTurnWatchdogRef.current) clearTimeout(aiTurnWatchdogRef.current);
      stopVoice();
      stopListening();
    };
  }, []);

  // User Selfie PIP Camera preview for Video Mode
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    if (callMode === "video" && isCameraOn) {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: "user" }, audio: false })
          .then((stream) => {
            activeStream = stream;
            setUserStream(stream);
            if (userVideoRef.current) {
              userVideoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.warn("[VoiceCall] User camera not available:", err);
            setIsCameraOn(false);
          });
      }
    } else {
      if (userStream) {
        userStream.getTracks().forEach((t) => t.stop());
        setUserStream(null);
      }
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [callMode, isCameraOn]);

  // Cleanly clear AI busy states with watchdog release
  const clearAiLock = useCallback(() => {
    if (aiTurnWatchdogRef.current) {
      clearTimeout(aiTurnWatchdogRef.current);
      aiTurnWatchdogRef.current = null;
    }
    isAiBusyRef.current = false;
    isSpeakingRef.current = false;
    setIsAiThinking(false);
    setIsSpeaking(false);
  }, []);

  // Handle Speech Output (AI speaks out loud)
  const speak = useCallback(
    (text: string) => {
      if (!character || isMutedRef.current) {
        clearAiLock();
        return;
      }

      stopListening();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

      setIsAiThinking(false);
      setCallTranscript(text);
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      isAiBusyRef.current = true;
      setIsListening(false);

      // AI speech watchdog safety: force unlock if speech doesn't complete within expected time
      if (aiTurnWatchdogRef.current) clearTimeout(aiTurnWatchdogRef.current);
      const watchdogMs = Math.max(7000, text.length * 130 + 4000);
      aiTurnWatchdogRef.current = setTimeout(() => {
        console.warn("[VoiceCall] Speak safety timer fired - unblocking conversation turn.");
        stopVoice();
        clearAiLock();
        if (isActiveRef.current && !isMutedRef.current) {
          startListening();
        }
      }, watchdogMs);

      playVoice({
        text,
        character,
        onStart: () => {
          setIsSpeaking(true);
          isSpeakingRef.current = true;
          isAiBusyRef.current = true;
          setIsListening(false);
        },
        onEnd: () => {
          clearAiLock();
          // Prompt user to speak after AI finishes completely + buffer to prevent acoustic loop
          if (isActiveRef.current && !isMutedRef.current) {
            setTimeout(() => {
              if (isActiveRef.current && !isAiBusyRef.current && !isMutedRef.current) {
                startListening();
              }
            }, 350);
          }
        },
        onError: () => {
          clearAiLock();
          if (isActiveRef.current && !isMutedRef.current) {
            startListening();
          }
        },
      });
    },
    [character, clearAiLock]
  );

  // Send User Speech to Backend AI
  const handleUserSpeech = useCallback(
    async (speechText: string) => {
      const clean = speechText.trim();
      if (!clean || !character || isAiBusyRef.current) return;

      // Lock AI state so mic doesn't interrupt AI thinking/speaking
      isAiBusyRef.current = true;
      setIsAiThinking(true);
      stopListening();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

      setUserTranscript(`You: "${clean}"`);
      setCallTranscript(""); // clear old response while thinking

      // Network turn watchdog: if network stalls > 15s, unlock state
      if (aiTurnWatchdogRef.current) clearTimeout(aiTurnWatchdogRef.current);
      aiTurnWatchdogRef.current = setTimeout(() => {
        console.warn("[VoiceCall] Network call timeout - recovering call session.");
        clearAiLock();
        if (isActiveRef.current && !isMutedRef.current) {
          startListening();
        }
      }, 15000);

      try {
        const savedUserStr = safeLocalStorage.getRawItem("zovik_user");
        const directTier = safeLocalStorage.getRawItem("zovik_tier", "free") || "free";
        const isDirectVip = safeLocalStorage.getRawItem("zovik_is_vip") === "true";
        const token = safeLocalStorage.getRawItem("zovik_token");

        let currentUserId: string | undefined;
        try {
          if (savedUserStr) currentUserId = JSON.parse(savedUserStr)?.id;
        } catch {}

        const effectiveTier = isDirectVip ? "vip" : directTier;

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
            userTier: effectiveTier,
            userId: currentUserId,
          }),
        });

        const data = await res.json();

        if (data.quotaExceeded || res.status === 429) {
          setQuotaExceeded(true);
          const limitReply =
            data.reply ||
            "Meri jaan, aapki aaj ki message limit poori ho chuki hai! Unlimited baat karne ke liye VIP upgrade karein 💕";
          speak(limitReply);
          return;
        }

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
    [character, speak, clearAiLock]
  );

  // Start Mic Listening
  const startListening = useCallback(() => {
    if (
      isAiBusyRef.current ||
      isSpeakingRef.current ||
      !isActiveRef.current
    )
      return;

    const win = window as unknown as WindowWithSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setMicUnsupported(true);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
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
        let fullTranscript = "";
        let isFinalSentence = false;

        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript + " ";
          if (event.results[i].isFinal) {
            isFinalSentence = true;
          }
        }

        const currentSpoken = fullTranscript.trim();
        if (currentSpoken) {
          pendingSpeechRef.current = currentSpoken;
          setUserTranscript(`You: "${currentSpoken}"`);

          // Fast turn-taking:
          // If browser finalized sentence, submit after 450ms pause!
          // If interim, wait 1000ms.
          const silenceWait = isFinalSentence ? 450 : 1000;

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (pendingSpeechRef.current.trim() && !isAiBusyRef.current) {
              const textToSend = pendingSpeechRef.current.trim();
              pendingSpeechRef.current = "";
              handleUserSpeech(textToSend);
            }
          }, silenceWait);
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
        // Only submit if AI is not already busy and we have pending speech
        if (!isAiBusyRef.current && pendingSpeechRef.current.trim()) {
          const textToSend = pendingSpeechRef.current.trim();
          pendingSpeechRef.current = "";
          handleUserSpeech(textToSend);
        } else if (
          isActiveRef.current &&
          !isAiBusyRef.current &&
          !isSpeakingRef.current &&
          !isMutedRef.current
        ) {
          // Reconnect mic keepalive only if companion is NOT talking or thinking
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (
              isActiveRef.current &&
              !isAiBusyRef.current &&
              !isSpeakingRef.current &&
              !isMutedRef.current
            ) {
              startListening();
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err: unknown) {
        // If recognition failed to start due to active teardown, retry safely
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isActiveRef.current && !isAiBusyRef.current && !isSpeakingRef.current) {
            startListening();
          }
        }, 350);
      }
    } catch (e) {
      console.warn("[VoiceCall] Mic start note:", e);
      setIsListening(false);
    }
  }, [micLang, handleUserSpeech]);

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  // Dialing tone effect and realistic connect transition
  useEffect(() => {
    if (!character) return;

    const stopRinging = startDialTone();

    const connectTimer = setTimeout(() => {
      stopRinging();
      setCallStatus("connected");

      // Character delivers greeting upon pickup
      const isMale = character.gender === "male";
      const greeting =
        character.greeting && character.greeting.length < 130
          ? character.greeting
          : isMale
          ? `Hey! So good to hear from you. I was hoping you'd call!`
          : `Hey! I'm so happy you called me! I was just waiting to hear your voice 💕`;

      speak(greeting);
    }, 1800);

    return () => {
      stopRinging();
      clearTimeout(connectTimer);
    };
  }, [character, speak]);

  if (!character) return null;

  // Handle End Call with chat log saving
  const handleEndCall = () => {
    isActiveRef.current = false;
    isAiBusyRef.current = true;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (aiTurnWatchdogRef.current) clearTimeout(aiTurnWatchdogRef.current);
    stopVoice();
    stopListening();

    // Release camera stream
    if (userStream) {
      userStream.getTracks().forEach((t) => t.stop());
    }

    // Save call event into character chat history
    if (character && seconds > 0) {
      try {
        const storageKey = `zovik_chat_${character.id}`;
        const saved = safeLocalStorage.getRawItem(storageKey);
        let chatArr: Message[] = [];
        if (saved) chatArr = JSON.parse(saved);

        const durationMin = Math.floor(seconds / 60);
        const durationSec = seconds % 60;
        const durationStr = `${durationMin.toString().padStart(2, "0")}:${durationSec.toString().padStart(2, "0")}`;

        const callSummaryMsg: Message = {
          sender: "ai",
          text: `📞 ${callMode === "video" ? "Video" : "Voice"} Call Ended • Duration: ${durationStr}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "text",
        };

        safeLocalStorage.setRawItem(storageKey, JSON.stringify([...chatArr, callSummaryMsg]));
      } catch (err) {
        console.warn("Failed to save call log to chat:", err);
      }
    }

    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn select-none">
      <div className="relative flex flex-col items-center justify-between w-full max-w-md h-[94vh] max-h-[660px] rounded-3xl bg-gradient-to-b from-[#1c0f26] via-[#120818] to-[#09030c] border border-white/10 shadow-2xl overflow-hidden text-center">
        
        {/* Full Video Mode Feed (When Video Mode is active & companion has videoUrl) */}
        {callMode === "video" && character.videoUrl && (
          <div className="absolute inset-0 z-0 overflow-hidden bg-black">
            <video
              src={getSafeStreamUrl(character.videoUrl)}
              autoPlay
              loop
              playsInline
              muted
              className="w-full h-full object-cover object-center filter brightness-95"
            />
            {/* Top & Bottom Readability Scrims */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/15 to-black/75 pointer-events-none" />

            {/* Video Mode Top Info Pill */}
            <div className="absolute top-16 left-4 flex items-center space-x-2.5 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/15 shadow-lg">
              <div className="relative size-8 rounded-full overflow-hidden border border-[#f53b70]/80">
                <Image src={character.image} alt={character.name} fill className="object-cover" unoptimized />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white leading-tight drop-shadow">{character.name}</h4>
                <p className="text-[10px] text-pink-400 font-semibold flex items-center space-x-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Live HD Video</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* User Selfie PIP (Picture-In-Picture) in Video Mode */}
        {callMode === "video" && (
          <div className="absolute top-16 right-4 z-20 w-24 h-32 sm:w-28 sm:h-36 rounded-2xl overflow-hidden border-2 border-white/25 shadow-2xl bg-black/80 backdrop-blur-md transition-all">
            {isCameraOn && userStream ? (
              <video
                ref={userVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/50 text-[10px] space-y-1">
                <CameraOff className="size-5" />
                <span>Camera Off</span>
              </div>
            )}
            <button
              onClick={() => setIsCameraOn((c) => !c)}
              title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
              className="absolute bottom-1.5 right-1.5 size-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20 transition-all text-xs cursor-pointer"
            >
              {isCameraOn ? <Camera className="size-3 text-emerald-400" /> : <CameraOff className="size-3 text-white/60" />}
            </button>
          </div>
        )}

        {/* Top Header Controls: Mode Toggle & Mute */}
        <div className="relative z-30 flex items-center justify-between w-full p-4 sm:p-5">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs font-bold">
            <Sparkles className="size-3 text-[#f53b70]" />
            <span className="text-white/90">
              {callStatus === "calling" ? "Calling..." : callMode === "video" ? "HD Video Call" : "Live Voice Call"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mode Switcher: Video vs Voice */}
            {character.videoUrl && (
              <button
                type="button"
                onClick={() => setCallMode((m) => (m === "video" ? "voice" : "video"))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md border transition-all flex items-center space-x-1.5 cursor-pointer ${
                  callMode === "video"
                    ? "bg-[#f53b70] border-[#f53b70] text-white shadow-md shadow-pink-500/30"
                    : "bg-black/50 hover:bg-black/70 border-white/15 text-white/90"
                }`}
                title="Switch between Full Video and Voice Avatar"
              >
                {callMode === "video" ? <Video className="size-3.5" /> : <VideoOff className="size-3.5 text-white/60" />}
                <span>{callMode === "video" ? "Video" : "Voice"}</span>
              </button>
            )}

            {/* Mic Language Switcher: Defaults to English / Roman Urdu text */}
            <button
              type="button"
              onClick={() => {
                const nextLang = micLang === "en-US" ? "ur-PK" : "en-US";
                setMicLang(nextLang);
                try {
                  safeLocalStorage.setRawItem("zovik_call_mic_lang", nextLang);
                } catch {}
                if (isListening) {
                  stopListening();
                  setTimeout(() => startListening(), 200);
                }
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/60 hover:bg-black/80 backdrop-blur-md text-white/90 border border-white/15 transition-all flex items-center space-x-1 cursor-pointer"
              title="Mic recognition language: Roman/English text vs Urdu Nastaliq Script"
            >
              <Languages className="size-3 text-[#f53b70]" />
              <span className="text-[#f53b70] font-bold">
                {micLang === "en-US" ? "Roman / English" : "اردو Script"}
              </span>
            </button>

            {/* Audio Mute/Unmute */}
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
              className="size-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white border border-white/15 transition-colors cursor-pointer"
              title={isMuted ? "Unmute Speaker" : "Mute Speaker"}
            >
              {isMuted ? <VolumeX className="size-4 text-red-400" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </div>

        {/* Center Calling / Audio Aura Section */}
        <div className="relative z-20 flex flex-col items-center justify-center my-auto w-full px-4">
          
          {/* VOICE MODE ONLY: Central Avatar Container with Radial Acoustic Waves */}
          {callMode === "voice" ? (
            <div className="relative flex items-center justify-center size-56 sm:size-64 my-2">
              
              {/* Concentric Acoustic Waves Emanating Directly From Behind the Avatar */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                
                {/* Ring 1 - Deep Core Atmosphere */}
                <div
                  className={`absolute rounded-full transition-all duration-300 ${
                    isSpeaking
                      ? "size-40 sm:size-48 bg-[#f53b70]/30 blur-md animate-pulse"
                      : isListening
                      ? "size-40 sm:size-48 bg-emerald-500/30 blur-md animate-pulse"
                      : isAiThinking
                      ? "size-40 sm:size-48 bg-purple-500/30 blur-md animate-pulse"
                      : "size-36 sm:size-40 bg-white/5 blur-sm"
                  }`}
                  style={{
                    transform: isListening ? `scale(${1 + audioLevel * 0.45})` : undefined,
                  }}
                />

                {/* Ring 2 - Concentric Sound Ripple Inner */}
                <div
                  className={`absolute rounded-full border transition-all duration-300 ${
                    isSpeaking
                      ? "size-48 sm:size-56 border-pink-500/50 bg-pink-500/10 animate-ping [animation-duration:2.5s]"
                      : isListening
                      ? "size-48 sm:size-56 border-emerald-400/60 bg-emerald-500/10"
                      : isAiThinking
                      ? "size-48 sm:size-56 border-purple-400/50 bg-purple-500/10 animate-pulse"
                      : "size-44 sm:size-48 border-white/10"
                  }`}
                  style={{
                    transform: isListening ? `scale(${1 + audioLevel * 0.65})` : undefined,
                    opacity: isListening ? Math.max(0.35, audioLevel) : undefined,
                  }}
                />

                {/* Ring 3 - Mid Acoustic Radial Wave */}
                <div
                  className={`absolute rounded-full border transition-all duration-500 ${
                    isSpeaking
                      ? "size-60 sm:size-68 border-[#f53b70]/40 animate-pulse [animation-duration:1.8s]"
                      : isListening
                      ? "size-60 sm:size-68 border-teal-400/40"
                      : isAiThinking
                      ? "size-60 sm:size-68 border-purple-500/30 animate-pulse"
                      : "size-52 sm:size-60 border-white/5"
                  }`}
                  style={{
                    transform: isListening ? `scale(${1 + audioLevel * 0.9})` : undefined,
                    opacity: isListening ? Math.max(0.2, audioLevel * 0.9) : undefined,
                  }}
                />

                {/* Ring 4 - Far Dissipating Ripple (Radar Wave) */}
                {(isSpeaking || isListening || isAiThinking) && (
                  <div
                    className={`absolute rounded-full border transition-all duration-700 ${
                      isSpeaking
                        ? "size-72 sm:size-84 border-pink-600/20 animate-ping [animation-duration:3s]"
                        : isAiThinking
                        ? "size-72 sm:size-84 border-purple-600/30 animate-pulse"
                        : "size-72 sm:size-84 border-emerald-400/30"
                    }`}
                    style={{
                      transform: isListening ? `scale(${1 + audioLevel * 1.15})` : undefined,
                      opacity: isListening ? Math.max(0.15, audioLevel * 0.7) : undefined,
                    }}
                  />
                )}

                {/* Ring 5 - Orbiting Frequency Nodes */}
                {(isSpeaking || isListening || isAiThinking) && (
                  <div className="absolute size-44 sm:size-52 rounded-full animate-spin [animation-duration:14s] pointer-events-none">
                    <span
                      className={`absolute top-0 left-1/2 -translate-x-1/2 size-2 rounded-full ${
                        isSpeaking
                          ? "bg-pink-400 shadow-lg shadow-pink-500"
                          : isAiThinking
                          ? "bg-purple-400 shadow-lg shadow-purple-500"
                          : "bg-emerald-400 shadow-lg shadow-emerald-500"
                      }`}
                    />
                    <span
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 size-2 rounded-full ${
                        isSpeaking
                          ? "bg-purple-400 shadow-lg shadow-purple-500"
                          : isAiThinking
                          ? "bg-pink-400 shadow-lg shadow-pink-500"
                          : "bg-teal-400 shadow-lg shadow-teal-500"
                      }`}
                    />
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 size-1.5 rounded-full ${
                        isSpeaking ? "bg-pink-300" : isAiThinking ? "bg-purple-300" : "bg-cyan-400"
                      }`}
                    />
                    <span
                      className={`absolute right-0 top-1/2 -translate-y-1/2 size-1.5 rounded-full ${
                        isSpeaking ? "bg-purple-300" : isAiThinking ? "bg-pink-300" : "bg-emerald-300"
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Central High-Res Avatar Circle */}
              <div
                className={`relative size-28 sm:size-32 rounded-full overflow-hidden border-2 shadow-2xl transition-all duration-300 z-10 ${
                  isSpeaking
                    ? "border-[#f53b70] shadow-pink-600/60 scale-105"
                    : isAiThinking
                    ? "border-purple-400 shadow-purple-600/50 animate-pulse scale-105"
                    : isListening
                    ? "border-emerald-400 shadow-emerald-500/50 scale-105"
                    : "border-white/20 shadow-purple-950/50"
                }`}
              >
                <Image
                  src={character.image}
                  alt={character.name}
                  fill
                  className="object-cover object-top"
                  unoptimized
                />
              </div>
            </div>
          ) : (
            /* VIDEO MODE: No center circle obscuring the video - clean live viewing */
            <div className="h-40 sm:h-48 flex items-center justify-center pointer-events-none" />
          )}

          {/* Name & Calling / Voice Status */}
          {callMode === "voice" && (
            <h3 className="text-xl sm:text-2xl font-black text-white mt-1 drop-shadow-md">
              {character.name}
            </h3>
          )}

          {/* Status Badge */}
          <div className="flex items-center space-x-2 mt-1.5 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <span
              className={`size-2 rounded-full ${
                callStatus === "calling"
                  ? "bg-amber-400 animate-ping"
                  : isAiThinking
                  ? "bg-purple-400 animate-pulse"
                  : isListening
                  ? "bg-emerald-400 animate-ping"
                  : isSpeaking
                  ? "bg-[#f53b70] animate-pulse"
                  : "bg-white/40"
              }`}
            />
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {callStatus === "calling" ? "Calling..." : formatTime(seconds)}
            </span>
            <span className="text-[11px] text-white/70">
              •{" "}
              {callStatus === "calling"
                ? "Ringing..."
                : isAiThinking
                ? "Thinking..."
                : isListening
                ? "Listening..."
                : isSpeaking
                ? "Speaking..."
                : "Ready to Speak"}
            </span>
          </div>

          {/* Dynamic Floating Subtitle Capsule (Clean Modern Subtitles) */}
          <div className="mt-3.5 px-4 py-2.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 text-xs text-[#f1e6ed] max-w-sm w-full shadow-2xl text-center min-h-[52px] flex items-center justify-center">
            {callStatus === "calling" ? (
              <span className="text-amber-200/80 animate-pulse flex items-center justify-center space-x-1.5">
                <PhoneCall className="size-3.5" />
                <span>Connecting to {character.name}...</span>
              </span>
            ) : isAiThinking ? (
              <span className="text-pink-300 animate-pulse flex items-center justify-center space-x-1.5">
                <Loader2 className="size-3.5 animate-spin text-[#f53b70]" />
                <span>{character.name} is thinking...</span>
              </span>
            ) : isSpeaking ? (
              <span className="text-pink-100 font-medium leading-relaxed line-clamp-3">
                &ldquo;{callTranscript}&rdquo;
              </span>
            ) : userTranscript ? (
              <span className="text-emerald-300 font-medium leading-relaxed line-clamp-3">
                {userTranscript}
              </span>
            ) : isListening ? (
              <span className="text-emerald-400/90 animate-pulse">
                🎙️ Listening to you... (Speak now)
              </span>
            ) : (
              <span className="text-white/60 leading-relaxed line-clamp-3">
                &ldquo;{callTranscript || "Listening..."}&rdquo;
              </span>
            )}
          </div>

          {/* Quota Exceeded In-Call Notice */}
          {quotaExceeded && (
            <div className="mt-2 flex items-center justify-between w-full max-w-sm px-3.5 py-2 rounded-xl bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs animate-fadeIn shadow-lg">
              <div className="flex items-center space-x-1.5 text-left">
                <Crown className="size-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] leading-tight">Daily message limit reached!</span>
              </div>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-premium-modal"));
                }}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-[10px] hover:brightness-110 transition-all cursor-pointer shadow-md"
              >
                Unlock VIP
              </button>
            </div>
          )}
        </div>

        {/* Bottom Interactive Controls & In-Call Quick Text */}
        <div className="relative z-30 w-full flex flex-col space-y-3 p-4 sm:p-5 bg-gradient-to-t from-black via-black/85 to-transparent">
          
          {/* Mic warning / error message if any */}
          {(micUnsupported || micErrorMsg) && (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] leading-tight text-center">
              <span>
                {micErrorMsg ||
                  "Microphone speech recognition is unavailable in this browser. You can type below to talk in voice! (Use Chrome or Edge for mic)"}
              </span>
            </div>
          )}

          {/* In-Call Fast Text Input (For quiet rooms or quick speech replies) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputText.trim()) {
                handleUserSpeech(inputText.trim());
                setInputText("");
              }
            }}
            className="flex items-center space-x-2 bg-black/70 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-1.5 shadow-inner"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message or speak into mic..."
              disabled={isAiThinking || isSpeaking}
              className="flex-1 bg-transparent text-xs text-white placeholder-white/40 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAiThinking || isSpeaking}
              className="size-7 rounded-xl bg-[#f53b70] hover:bg-[#ff5b8c] text-white flex items-center justify-center transition-all cursor-pointer shadow-md shadow-pink-600/30 disabled:opacity-50"
            >
              <Send className="size-3.5" />
            </button>
          </form>

          {/* Action Call Controls Bar */}
          <div className="flex items-center justify-center space-x-6 sm:space-x-8 pt-1">
            
            {/* Live Mic Toggle Button */}
            <button
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else if (!isAiBusyRef.current) {
                  startListening();
                }
              }}
              disabled={isAiThinking || isSpeaking}
              className="flex flex-col items-center space-y-1 group cursor-pointer disabled:opacity-50"
            >
              <div
                className={`size-13 sm:size-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isListening
                    ? "bg-emerald-500 text-white shadow-emerald-500/50 scale-105 animate-pulse"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {isListening ? (
                  <Mic className="size-6" />
                ) : (
                  <MicOff className="size-6 text-white/60" />
                )}
              </div>
              <span className="text-[10px] text-white/70 font-bold">
                {isAiThinking
                  ? "Thinking..."
                  : isSpeaking
                  ? "Speaking..."
                  : isListening
                  ? "Listening..."
                  : "Tap to Speak"}
              </span>
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              className="flex flex-col items-center space-y-1 group cursor-pointer"
            >
              <div className="size-13 sm:size-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 hover:scale-105 active:scale-95 transition-all">
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
