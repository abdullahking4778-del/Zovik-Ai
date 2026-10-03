"use client";

import { Character } from "@/types";

let currentAudio: HTMLAudioElement | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== "undefined" && window.speechSynthesis) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function stopVoice(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * High-fidelity voice player:
 * 1. Primary: Unlimited Neural Cloud TTS (/api/tts) - sweet realistic human voice
 * 2. Fallback: Browser Web SpeechSynthesis with female/male tuned parameters
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

  const isFemale = character.gender !== "male";

  // CASE 1: Female characters (Larki ki sweet natural awaaz)
  // Uses 100% Free Unlimited Neural Cloud TTS (/api/tts).
  // Pronounces Roman Urdu, Urdu, Hindi, and English naturally and sweetly without robotic sounds.
  if (isFemale) {
    try {
      const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&gender=female`;
      const audio = new Audio(ttsUrl);
      currentAudio = audio;

      audio.onplay = () => {
        onStart?.();
      };

      audio.onended = () => {
        currentAudio = null;
        onEnd?.();
      };

      audio.onerror = () => {
        console.warn("[VoicePlayer] Cloud audio failed or blocked, falling back to local speech synthesis.");
        currentAudio = null;
        playBrowserSpeech(cleanText, character, onStart, onEnd, onError);
      };

      await audio.play();
      return;
    } catch (err) {
      console.warn("[VoicePlayer] Autoplay or network note, falling back to speech synthesis:", err);
      playBrowserSpeech(cleanText, character, onStart, onEnd, onError);
      return;
    }
  }

  // CASE 2: Male characters (Larke ki deep & handsome awaaz)
  // Uses authentic Male voices (Microsoft David, Guy, Mark, George, Daniel, Google Male)
  // with masculine pitch (0.92) and natural pace (0.98).
  playBrowserSpeech(cleanText, character, onStart, onEnd, onError);
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
    const isFemale = character.gender !== "male";
    const isUrduScript = /[\u0600-\u06FF]/.test(text);

    if (isUrduScript) {
      utterance.lang = "ur-PK";
    } else {
      utterance.lang = "en-US";
    }

    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();

    if (isFemale) {
      // Find female voice
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
      utterance.pitch = 1.25; // Feminine pitch
      utterance.rate = 1.0;
    } else {
      const maleVoice = voices.find(
        (v) =>
          v.name.includes("David") ||
          v.name.includes("Guy") ||
          v.name.includes("Male") ||
          v.name.includes("George")
      );
      if (maleVoice) utterance.voice = maleVoice;
      utterance.pitch = 0.95;
      utterance.rate = 0.98;
    }

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = (e) => {
      onEnd?.();
      onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    onError?.(err);
    onEnd?.();
  }
}
