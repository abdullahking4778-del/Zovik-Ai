import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import defaultCharactersData from "@/data/characters.json";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getPersistentCustomCharacters,
  savePersistentCustomCharacter,
  deletePersistentCustomCharacter,
  generateUniqueId,
} from "@/lib/serverDb";
import { Character } from "@/types";

const defaultCharacters: Character[] = defaultCharactersData as Character[];
const publicCharsDir = path.join(process.cwd(), "public", "characters");

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    const custom = await getPersistentCustomCharacters();
    const all = [...custom, ...defaultCharacters];

    // List available local images
    let availableImages: string[] = [];
    try {
      if (fs.existsSync(publicCharsDir)) {
        availableImages = fs
          .readdirSync(publicCharsDir)
          .filter((f) => f.endsWith(".webp") || f.endsWith(".jpg") || f.endsWith(".png"));
      }
    } catch (e) {
      console.error("[Admin Characters] Available images read error:", e);
    }

    return NextResponse.json({
      success: true,
      characters: all,
      availableImages: availableImages.map((img) => `/characters/${img}`),
      total: all.length,
    });
  } catch (err: unknown) {
    console.error("[Admin Characters GET Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error loading admin characters" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    let companion: Partial<Character>;
    try {
      companion = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 });
    }

    if (!companion.name) {
      return NextResponse.json({ success: false, error: "Companion name is required" }, { status: 400 });
    }

    const charId = companion.id || generateUniqueId("char");
    const formatted: Character = {
      id: charId,
      slug: companion.slug || companion.name.toLowerCase().replace(/\s+/g, "-"),
      name: companion.name.trim(),
      age: Number(companion.age) || 21,
      gender: companion.gender || "female",
      style: companion.style || "realistic",
      tagline: companion.tagline || `${companion.name} • Official AI`,
      desc: companion.desc || "An enchanting AI companion ready to chat.",
      image: companion.image || "/characters/zovik_01.jpg",
      badge: companion.badge || "NEW",
      category: companion.category || "Trending",
      series: !!companion.series,
      verified: true,
      online: true,
      tags: Array.isArray(companion.tags)
        ? companion.tags
        : typeof companion.tags === "string"
        ? (companion.tags as string).split(",").map((t) => t.trim())
        : ["Flirty", "Sweet"],
      voice: companion.voice || "Warm Whisper",
      greeting: companion.greeting || `Hey there... so glad you stopped by! What's on your mind? 💕`,
      videoUrl: companion.videoUrl,
      gallery: companion.gallery || [companion.image || "/characters/zovik_01.jpg"],
      messages: [
        {
          sender: "ai",
          text: companion.greeting || `Hey there... so glad you stopped by! What's on your mind? 💕`,
          time: "Just now",
        },
      ],
    };

    await savePersistentCustomCharacter(formatted);

    return NextResponse.json({ success: true, message: "Companion saved successfully!", character: formatted });
  } catch (err: unknown) {
    console.error("[Admin Characters POST Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error saving companion" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing companion id" }, { status: 400 });
    }

    await deletePersistentCustomCharacter(id);

    return NextResponse.json({ success: true, message: "Companion removed successfully" });
  } catch (err: unknown) {
    console.error("[Admin Characters DELETE Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error removing companion" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const targetId: string | undefined = body.characterId || body.id;
    const gallery: string[] | undefined = body.gallery;

    if (!targetId || !Array.isArray(gallery)) {
      return NextResponse.json({ success: false, error: "Missing characterId (or id) or gallery array" }, { status: 400 });
    }

    const custom = await getPersistentCustomCharacters();
    const existing = custom.find((c) => c.id === targetId);

    if (existing) {
      existing.gallery = gallery;
      await savePersistentCustomCharacter(existing);
      return NextResponse.json({ success: true, message: "Character gallery updated successfully!", gallery });
    }

    // If default character, create a custom override in persistent store
    const def = defaultCharacters.find((c) => c.id === targetId);
    if (def) {
      const overrideChar: Character = { ...def, gallery };
      await savePersistentCustomCharacter(overrideChar);
      return NextResponse.json({ success: true, message: "Character gallery updated successfully!", gallery });
    }

    return NextResponse.json({ success: false, error: "Character not found" }, { status: 404 });
  } catch (err: unknown) {
    console.error("[Admin Characters PATCH Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error updating gallery" }, { status: 500 });
  }
}
