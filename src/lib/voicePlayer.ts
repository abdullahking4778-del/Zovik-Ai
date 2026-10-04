"use client";

import { Character } from "@/types";

let currentAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let watchdogTimer: NodeJS.Timeout | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== "undefined" && window.speechSynthesis) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function stopVoice(): void {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
    currentAudio = null;
  }
  if (activeUtterance) {
    activeUtterance.onstart = null;
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
    activeUtterance = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Bulletproof Voice Player:
 * 1. Primary for Female: Unlimited Neural Cloud TTS (/api/tts)
 * 2. Primary for Male / Fallback: Browser Web SpeechSynthesis with tuned pitch/rate
 * 3. Guaranteed Safety:
 *    - Anchored utterance prevents Chromium garbage-collection bug
 *    - Watchdog timer guarantees onEnd() ALWAYS fires within expected speech length
 *    - safeEnd() ensures onEnd is called exactly once
 */
export async function playVoice({
  text,
  character,
  onStart,
  onEnd,
  onError,
}: {
  text: string;
  character: Character;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}): Promise<void> {
  stopVoice();

  const cleanText = text
    .replace(/\*[^*]*\*/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleanText) {
    onEnd?.();
    return;
  }

  let hasEnded = false;
  const safeEnd = () => {
    if (hasEnded) return;
    hasEnded = true;
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    currentAudio = null;
    activeUtterance = null;
    onEnd?.();
  };

  // Watchdog timer: speech cannot run longer than (length * 130ms + 5000ms buffer)
  const maxSpeechDuration = Math.max(6000, cleanText.length * 130 + 5000);
  watchdogTimer = setTimeout(() => {
    console.warn("[VoicePlayer] Watchdog safety timer fired - releasing audio lock.");
    stopVoice();
    safeEnd();
  }, maxSpeechDuration);

  const isFemale = character.gender !== "male";

  // CASE 1: Female characters (Larki ki sweet natural awaaz via /api/tts)
  if (isFemale) {
    try {
      const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&gender=female`;
      const audio = new Audio(ttsUrl);
      currentAudio = audio;

      audio.onplay = () => {
        onStart?.();
      };

      audio.onended = () => {
        safeEnd();
      };

      audio.onerror = () => {
        console.warn("[VoicePlayer] Cloud audio failed, falling back to local speech synthesis.");
        currentAudio = null;
        playBrowserSpeech(cleanText, character, onStart, safeEnd, onError);
      };

      await audio.play();
      return;
    } catch (err) {
      console.warn("[VoicePlayer] Autoplay or network note, falling back to speech synthesis:", err);
      playBrowserSpeech(cleanText, character, onStart, safeEnd, onError);
      return;
    }
  }

  // CASE 2: Male characters (Larke ki deep handsome awaaz)
  playBrowserSpeech(cleanText, character, onStart, safeEnd, onError);
}

function playBrowserSpeech(
  text: string,
  character: Character,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: unknown) => void
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterance = utterance; // Anchored in module scope to prevent GC bug

    const isFemale = character.gender !== "male";
    const isUrduScript = /[\u0600-\u06FF]/.test(text);

    if (isUrduScript) {
      utterance.lang = "ur-PK";
    } else {
      utterance.lang = "en-US";
    }

    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();

    if (isFemale) {
      const femaleVoice = voices.find(
        (v) =>
          v.name.includes("Natural") ||
          v.name.includes("Neural") ||
          v.name.includes("Google US English") ||
          v.name.includes("Google UK English Female") ||
          v.name.includes("Jenny") ||
          v.name.includes("Zira") ||
          v.name.includes("Samantha") ||
          v.name.includes("Victoria") ||
          v.name.includes("Karen") ||
          v.name.toLowerCase().includes("female")
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      utterance.pitch = 1.2;
      utterance.rate = 1.0;
    } else {
      const maleVoice = voices.find(
        (v) =>
          v.name.includes("David") ||
          v.name.includes("Guy") ||
          v.name.includes("Male") ||
          v.name.includes("George") ||
          v.name.includes("Daniel") ||
          v.name.includes("Mark") ||
          v.name.includes("Google UK English Male")
      );
      if (maleVoice) utterance.voice = maleVoice;
      utterance.pitch = 0.92;
      utterance.rate = 0.96;
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      activeUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      onEnd?.();
      onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    activeUtterance = null;
    onError?.(err);
    onEnd?.();
  }
}
