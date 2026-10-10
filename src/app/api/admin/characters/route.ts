import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getAllPersistentCharacters,
  savePersistentCustomCharacter,
  deletePersistentCharacter,
  generateUniqueId,
} from "@/lib/serverDb";
import { Character } from "@/types";
import { normalizeTags } from "@/lib/tagHelper";

const publicCharsDir = path.join(process.cwd(), "public", "characters");

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    const all = await getAllPersistentCharacters();

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
    const isVipTier = companion.accessTier === "vip" || companion.accessTier === "plus" || companion.isVipOnly === true;

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
      badge: companion.badge || (isVipTier ? "VIP" : "NEW"),
      category: companion.category || "Trending",
      series: !!companion.series,
      verified: true,
      online: true,
      tags: companion.tags ? normalizeTags(companion.tags) : ["Flirty", isVipTier ? "VIP" : "Sweet"],
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
      accessTier: isVipTier ? "vip" : "free",
      isVipOnly: isVipTier,
    };

    await savePersistentCustomCharacter(formatted);

    return NextResponse.json({ success: true, message: "Companion saved successfully!", character: formatted });
  } catch (err: unknown) {
    console.error("[Admin Characters POST Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error saving companion" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    const body: Partial<Character> & { id: string } = await req.json();
    if (!body || !body.id) {
      return NextResponse.json({ success: false, error: "Missing companion id" }, { status: 400 });
    }

    const all = await getAllPersistentCharacters();
    const existing = all.find((c) => c.id === body.id || c.slug === body.id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Companion not found" }, { status: 404 });
    }

    const isVipTier = body.accessTier === "vip" || body.accessTier === "plus" || body.isVipOnly === true;

    const updated: Character = {
      ...existing,
      ...body,
      id: existing.id,
      slug: existing.slug,
      name: body.name ? body.name.trim() : existing.name,
      age: body.age !== undefined ? (Number(body.age) || existing.age || 21) : (existing.age || 21),
      tags: body.tags !== undefined ? normalizeTags(body.tags) : normalizeTags(existing.tags),
      accessTier: isVipTier ? "vip" : "free",
      isVipOnly: isVipTier,
      badge: body.badge || (isVipTier ? "VIP" : existing.badge),
    };

    await savePersistentCustomCharacter(updated);

    return NextResponse.json({ success: true, message: "Companion updated successfully!", character: updated });
  } catch (err: unknown) {
    console.error("[Admin Characters PUT Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error updating companion" }, { status: 500 });
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

    await deletePersistentCharacter(id);

    return NextResponse.json({ success: true, message: "Companion permanently deleted" });
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

    if (!targetId) {
      return NextResponse.json({ success: false, error: "Missing characterId or id" }, { status: 400 });
    }

    const all = await getAllPersistentCharacters();
    const existing = all.find((c) => c.id === targetId || c.slug === targetId);

    if (!existing) {
      return NextResponse.json({ success: false, error: "Character not found" }, { status: 404 });
    }

    if (gallery && Array.isArray(gallery)) {
      existing.gallery = gallery;
      if (gallery.length > 0) {
        existing.image = gallery[0];
      }
    }
    if (body.image) {
      existing.image = body.image;
    }

    // Merge any other updated fields
    if (body.accessTier) {
      existing.accessTier = body.accessTier === "vip" || body.accessTier === "plus" ? "vip" : "free";
      existing.isVipOnly = existing.accessTier === "vip";
    }
    if (body.videoUrl !== undefined) existing.videoUrl = body.videoUrl;
    if (body.name) existing.name = body.name;

    await savePersistentCustomCharacter(existing);
    return NextResponse.json({ success: true, message: "Character updated successfully!", character: existing });
  } catch (err: unknown) {
    console.error("[Admin Characters PATCH Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error updating character" }, { status: 500 });
  }
}
