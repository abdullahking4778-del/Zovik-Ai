import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import defaultCharacters from "@/data/characters.json";
import { verifyAdminRequest } from "@/lib/adminAuth";

const customCharsFile = path.join(process.cwd(), "src", "data", "custom_characters.json");
const defaultCharsFile = path.join(process.cwd(), "src", "data", "characters.json");
const publicCharsDir = path.join(process.cwd(), "public", "characters");

function getCustomCharacters(): any[] {
  try {
    if (fs.existsSync(customCharsFile)) {
      return JSON.parse(fs.readFileSync(customCharsFile, "utf-8"));
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

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  const custom = getCustomCharacters();
  let defaultChars = defaultCharacters;
  try {
    if (fs.existsSync(defaultCharsFile)) {
      defaultChars = JSON.parse(fs.readFileSync(defaultCharsFile, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading default characters:", e);
  }
  const all = [...custom, ...defaultChars];

  // List available local images
  let availableImages: string[] = [];
  try {
    if (fs.existsSync(publicCharsDir)) {
      availableImages = fs.readdirSync(publicCharsDir).filter((f) => f.endsWith(".webp") || f.endsWith(".jpg") || f.endsWith(".png"));
    }
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({
    characters: all,
    availableImages: availableImages.map((img) => `/characters/${img}`),
    total: all.length,
  });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    const companion = await req.json();

    if (!companion.name) {
      return NextResponse.json({ error: "Companion name is required" }, { status: 400 });
    }

    const custom = getCustomCharacters();
    const existingIdx = custom.findIndex((c) => c.id === companion.id);

    if (existingIdx >= 0) {
      // Update
      custom[existingIdx] = { ...custom[existingIdx], ...companion };
    } else {
      // Create new
      const newCompanion = {
        id: companion.id || `custom-${Date.now()}`,
        slug: companion.name.toLowerCase().replace(/\s+/g, "-"),
        name: companion.name,
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
        tags: Array.isArray(companion.tags) ? companion.tags : (companion.tags || "Flirty, Sweet").split(",").map((t: string) => t.trim()),
        voice: companion.voice || "Warm Whisper",
        greeting: companion.greeting || `Hey there... so glad you stopped by! What's on your mind? 💕`,
        messages: [
          {
            sender: "ai",
            text: companion.greeting || `Hey there... so glad you stopped by! What's on your mind? 💕`,
            time: "Just now",
          },
        ],
      };
      custom.unshift(newCompanion);
    }

    saveCustomCharacters(custom);
    return NextResponse.json({ success: true, message: "Companion saved successfully!" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing companion id" }, { status: 400 });
    }

    let custom = getCustomCharacters();
    custom = custom.filter((c) => c.id !== id);
    saveCustomCharacters(custom);

    return NextResponse.json({ success: true, message: "Companion removed" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session invalid or missing." }, { status: 401 });
  }

  try {
    const { characterId, gallery } = await req.json();

    if (!characterId || !Array.isArray(gallery)) {
      return NextResponse.json({ error: "Missing characterId or gallery array" }, { status: 400 });
    }

    let updated = false;

    // 1. Check custom characters
    const custom = getCustomCharacters();
    const cIdx = custom.findIndex((c) => c.id === characterId);
    if (cIdx >= 0) {
      custom[cIdx].gallery = gallery;
      saveCustomCharacters(custom);
      updated = true;
    }

    // 2. Check default characters
    if (fs.existsSync(defaultCharsFile)) {
      const defChars = JSON.parse(fs.readFileSync(defaultCharsFile, "utf-8"));
      const dIdx = defChars.findIndex((c: any) => c.id === characterId);
      if (dIdx >= 0) {
        defChars[dIdx].gallery = gallery;
        const tmpDef = `${defaultCharsFile}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
        try {
          fs.writeFileSync(tmpDef, JSON.stringify(defChars, null, 2), "utf-8");
          fs.renameSync(tmpDef, defaultCharsFile);
        } catch {
          try { if (fs.existsSync(tmpDef)) fs.unlinkSync(tmpDef); } catch {}
        }
        updated = true;
      }
    }

    if (!updated) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Character gallery updated successfully!", gallery });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
