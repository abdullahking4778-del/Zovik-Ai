import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import defaultCharacters from "@/data/characters.json";
import { verifyAdminRequest } from "@/lib/adminAuth";

const customCharsFile = path.join(process.cwd(), "src", "data", "custom_characters.json");
const charactersFile = path.join(process.cwd(), "src", "data", "characters.json");

function getCustomCharacters() {
  try {
    if (fs.existsSync(customCharsFile)) {
      const data = fs.readFileSync(customCharsFile, "utf-8");
      return JSON.parse(data || "[]");
    }
  } catch (e) {
    console.error("Error reading custom characters:", e);
  }
  return [];
}

function saveCustomCharacters(chars: any[]) {
  const tmpPath = `${customCharsFile}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    const dir = path.dirname(customCharsFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(chars, null, 2), "utf-8");
    fs.renameSync(tmpPath, customCharsFile);
  } catch (e) {
    console.error("Error saving custom characters:", e);
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getDefaultCharacters() {
  try {
    if (fs.existsSync(charactersFile)) {
      const data = fs.readFileSync(charactersFile, "utf-8");
      return JSON.parse(data || "[]");
    }
  } catch (e) {
    console.error("Error reading characters.json:", e);
  }
  return defaultCharacters;
}

export async function GET() {
  const custom = getCustomCharacters();
  const base = getDefaultCharacters();
  return NextResponse.json(
    {
      characters: [...custom, ...base],
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const newCharacter = await req.json();
    if (!newCharacter || !newCharacter.name) {
      return NextResponse.json({ error: "Invalid character data: name is required" }, { status: 400 });
    }

    const current = getCustomCharacters();
    const updated = [newCharacter, ...current];
    saveCustomCharacters(updated);

    return NextResponse.json({ success: true, character: newCharacter });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to add character" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing character ID" }, { status: 400 });
    }

    let custom = getCustomCharacters();
    custom = custom.filter((c: any) => c.id !== id);
    saveCustomCharacters(custom);

    return NextResponse.json({ success: true, message: "Custom character deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete character" }, { status: 500 });
  }
}
