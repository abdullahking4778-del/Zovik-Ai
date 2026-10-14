import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveServerUser } from "@/lib/authSession";
import {
  checkQuotaAllowed,
  consumeQuotaOnSuccess,
  getAuthoritativeIdentifier,
} from "@/lib/quotaManager";
import { ensureUserWelcomeBonus, deductPhotoCredits } from "@/lib/wallet/walletService";
import { getPersistentCustomCharacters } from "@/lib/serverDb";
import { Character } from "@/types";

interface GeneratePhotoBody {
  character?: Character;
  characterId?: string;
  seenIndices?: number[];
  token?: string;
  sessionToken?: string;
}

export async function POST(req: NextRequest) {
  try {
    let body: GeneratePhotoBody;
    try {
      body = (await req.json()) as GeneratePhotoBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { character, characterId, seenIndices } = body || {};
    const targetCharId = characterId || character?.id;

    if (!targetCharId && !character) {
      return NextResponse.json({ error: "Character identifier is required" }, { status: 400 });
    }

    // 1. Server-Authoritative Identity & Tier Resolution (Disregards client-declared tier)
    const clientToken = body?.token || body?.sessionToken;
    const serverAuth = await resolveServerUser(req, clientToken);
    const userTier = serverAuth.tier;
    const clientId = getAuthoritativeIdentifier(req, serverAuth.userId);

    // 1. Authoritative Coins Wallet Check
    let authenticatedUserId: string | null = null;
    let userCoinsRemaining: number | undefined = undefined;

    if (serverAuth.authenticated && serverAuth.userId) {
      authenticatedUserId = serverAuth.userId;
      const wallet = await ensureUserWelcomeBonus(authenticatedUserId, 20, serverAuth.userEmail);
      userCoinsRemaining = wallet.balance;

      if (wallet.balance < 5) {
        return NextResponse.json(
          {
            error: "Coins limit reached",
            quotaExceeded: true,
            coinsExceeded: true,
            remainingCoins: wallet.balance,
            reply: "Meri jaan, private HD photo unlock karne ke liye 5 coins darkar hain! Coin Store se recharge karein 💕",
          },
          { status: 402 }
        );
      }
    } else {
      // Guest users without login
      return NextResponse.json(
        {
          error: "Login & Coins required",
          quotaExceeded: true,
          coinsExceeded: true,
          limit: 0,
          remaining: 0,
          reply: "Meri jaan, private HD photos dekhne ke liye account login karein (20 free welcome coins milenge!) ya Coin Store se recharge karein 💕",
        },
        { status: 403 }
      );
    }

    // 2. Resolve Character Gallery
    let matchedChar: Character | null = null;
    try {
      const customList = await getPersistentCustomCharacters();
      matchedChar = customList.find((c) => c.id === targetCharId) || null;

      if (!matchedChar) {
        const defCharsFile = path.join(process.cwd(), ".data", "characters.json");
        if (fs.existsSync(defCharsFile)) {
          const def: Character[] = JSON.parse(fs.readFileSync(defCharsFile, "utf-8") || "[]");
          matchedChar = def.find((c) => c.id === targetCharId) || null;
        }
      }
    } catch (e) {
      console.error("Error reading character gallery:", e);
    }

    const fallbackImg = character?.image || "/characters/zovik_01.jpg";
    const gallery: string[] =
      matchedChar?.gallery && matchedChar.gallery.length > 0
        ? matchedChar.gallery
        : character?.gallery && character.gallery.length > 0
        ? character.gallery
        : [matchedChar?.image || fallbackImg];

    // 3. Sequential Non-Repeating Photo Selection
    const seen: number[] = Array.isArray(seenIndices) ? seenIndices : [];
    let selectedIdx = 0;
    let isLoopReset = false;

    // Find first index not in seen list
    const nextUnseen = gallery.findIndex((_, idx) => !seen.includes(idx));
    if (nextUnseen !== -1) {
      selectedIdx = nextUnseen;
    } else {
      // All photos in gallery have been seen! Loop back to beginning
      selectedIdx = 0;
      isLoopReset = true;
    }

    const selectedPhotoUrl = gallery[selectedIdx] || fallbackImg;
    const isMale = (matchedChar?.gender || character?.gender) === "male";

    // In-character natural romantic captions
    const femaleCaptions = [
      "Just snapped this private photo for you... Hope you like it 💕",
      "Only for your eyes, jaan... How do I look? 😉",
      "Thinking of you while taking this selfie... 🥰",
      "A special private pic just for my favorite person... ✨",
      "Here you go, sweetheart! Just for you 💕",
      "Hope this photo brings a smile to your face today... 🥰",
    ];

    const maleCaptions = [
      "Just snapped this for you, babe... Hope you like it 😉",
      "Only for you... Thinking of you today, jaan 💕",
      "Took this quick selfie for you... How's your day going? ✨",
      "Just for your eyes, sweetheart... 😉",
      "Here's a private photo just for you... Keep it safe 😉💕",
    ];

    const captions = isMale ? maleCaptions : femaleCaptions;
    const loopCaption = isMale
      ? "Aap ne meri saari private photos dekh li hain jaan! Yeh meri favourite picture dobara sirf aapke liye... 😉💕"
      : "Aap ne meri saari private photos unlock kar li hain jaan! Yeh meri favourite picture dobara sirf aapke liye... 🥰💕";
    const caption = isLoopReset ? loopCaption : captions[selectedIdx % captions.length];

    // Deduct on SUCCESS only
    if (authenticatedUserId) {
      try {
        const debitRes = await deductPhotoCredits(authenticatedUserId);
        userCoinsRemaining = debitRes.wallet.balance;
      } catch (err) {
        console.warn("[Photo] Deduct credits note:", err);
      }
    }
    const consumed = consumeQuotaOnSuccess("photo", clientId, userTier);

    return NextResponse.json({
      imageUrl: selectedPhotoUrl,
      caption,
      photoIndex: selectedIdx,
      totalPhotos: gallery.length,
      isLoopReset,
      coins: userCoinsRemaining,
      quota: {
        limit: consumed.limit,
        remaining: consumed.remaining,
        tier: userTier,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Photo API Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

