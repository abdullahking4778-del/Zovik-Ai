import { NextRequest, NextResponse } from "next/server";
import defaultCharactersData from "@/data/characters.json";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getPersistentCustomCharacters,
  savePersistentCustomCharacter,
  deletePersistentCustomCharacter,
  generateUniqueId,
} from "@/lib/serverDb";
import { Character } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const defaultCharacters: Character[] = defaultCharactersData as Character[];

export async function GET() {
  try {
    const custom = await getPersistentCustomCharacters();
    return NextResponse.json(
      {
        success: true,
        characters: [...custom, ...defaultCharacters],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[Characters GET Error]:", err);
    return NextResponse.json(
      {
        success: true,
        characters: defaultCharacters,
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    let newCharacter: Partial<Character>;
    try {
      newCharacter = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 });
    }

    if (!newCharacter || !newCharacter.name) {
      return NextResponse.json({ success: false, error: "Invalid character data: name is required" }, { status: 400 });
    }

    const charId = newCharacter.id || generateUniqueId("char");
    const formattedChar: Character = {
      id: charId,
      slug: newCharacter.slug || charId,
      name: newCharacter.name.trim(),
      age: Number(newCharacter.age) || 22,
      gender: newCharacter.gender || "female",
      style: newCharacter.style || "realistic",
      tagline: newCharacter.tagline || `${newCharacter.name} • AI Companion`,
      desc: newCharacter.desc || "Custom AI Companion created in Zovik AI.",
      image: newCharacter.image || "/characters/zovik_01.jpg",
      category: newCharacter.category || "Trending",
      badge: newCharacter.badge || "NEW",
      series: false,
      verified: true,
      online: true,
      tags: newCharacter.tags || ["Custom", "VIP"],
      voice: newCharacter.voice || "Warm, affectionate voice",
      greeting: newCharacter.greeting || `Hi there! I'm ${newCharacter.name}. Nice to meet you 💕`,
      videoUrl: newCharacter.videoUrl,
      gallery: newCharacter.gallery || [newCharacter.image || "/characters/zovik_01.jpg"],
      messages: newCharacter.messages || [],
    };

    const saved = await savePersistentCustomCharacter(formattedChar);

    return NextResponse.json({ success: true, character: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add character";
    console.error("[Characters POST Error]:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing character ID" }, { status: 400 });
    }

    await deletePersistentCustomCharacter(id);

    return NextResponse.json({ success: true, message: "Custom character deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete character";
    console.error("[Characters DELETE Error]:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
