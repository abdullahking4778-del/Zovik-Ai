import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Free, Unlimited Neural Voice TTS API
 * Uses Google Translate's high-fidelity neural audio engine.
 * Completely free of cost, zero API keys required, zero subscription limits.
 */

// Common Roman Urdu keywords to detect Pakistani conversational context
const ROMAN_URDU_REGEX =
  /\b(jaan|meri|tum|aap|kesi|kese|kya|kyun|theek|pyar|bistar|raat|kiss|chumma|pappi|dil|mohabbat|suno|kaho|bolo|acha|haan|nahi|karna|hoga|raha|rahi|hoon|ho|hai|hain|shona|babu|khana|khel|dekh|baat|batein)\b/i;

function splitIntoChunks(text: string, maxLen = 150): string[] {
  // Clean stage directions, asterisks, brackets, emojis
  const clean = text
    .replace(/\*[^*]*\*/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^\p{L}\p{N}\s.,?!'’\-]/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!clean) return [];

  // Split by sentence endings (. , ! ? \n)
  const sentences = clean.split(/(?<=[.,!?\n])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    if ((current + " " + s).trim().length <= maxLen) {
      current = (current + " " + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length > maxLen) {
        // Break long sentence by space
        const words = s.split(" ");
        let sub = "";
        for (const w of words) {
          if ((sub + " " + w).trim().length <= maxLen) {
            sub = (sub + " " + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        if (sub) current = sub;
        else current = "";
      } else {
        current = s;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text") || "";
  const requestedLang = searchParams.get("lang");
  const gender = searchParams.get("gender") || "female";

  if (!text.trim()) {
    return new NextResponse("Missing text parameter", { status: 400 });
  }

  try {
    // 1. Detect optimal accent / language for voice
    const isUrduScript = /[\u0600-\u06FF]/.test(text);
    const isRomanUrdu = ROMAN_URDU_REGEX.test(text);

    let targetLang = "hi"; // Default to sweet South Asian voice for Roman Urdu
    if (requestedLang) {
      targetLang = requestedLang;
    } else if (isUrduScript) {
      targetLang = "ur";
    } else if (isRomanUrdu) {
      targetLang = "hi"; // Hindi engine has the sweetest natural Roman Urdu pronunciation
    } else {
      targetLang = "en"; // English
    }

    // 2. Split into audio-sized chunks
    const chunks = splitIntoChunks(text, 150);
    if (chunks.length === 0) {
      return new NextResponse("Empty text after filtering", { status: 400 });
    }

    // 3. Fetch audio buffers in parallel or sequential chunks
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        chunk
      )}&tl=${targetLang}&client=tw-ob`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: "https://translate.google.com/",
        },
      });

      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        if (arrayBuf.byteLength > 0) {
          audioBuffers.push(Buffer.from(arrayBuf));
        }
      }
    }

    if (audioBuffers.length === 0) {
      return new NextResponse("TTS audio generation failed", { status: 502 });
    }

    // 4. Combine MP3 audio buffers
    const combinedBuffer = Buffer.concat(audioBuffers);

    return new NextResponse(combinedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": combinedBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Disposition": "inline; filename=\"speech.mp3\"",
      },
    });
  } catch (err: unknown) {
    console.error("[TTS API Error]:", err);
    return new NextResponse("Internal TTS generation error", { status: 500 });
  }
}
