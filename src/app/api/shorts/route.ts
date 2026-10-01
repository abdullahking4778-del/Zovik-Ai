import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyAdminRequest } from "@/lib/adminAuth";

const SHORTS_FILE = path.join(process.cwd(), "src", "data", "shorts.json");

function getShorts() {
  try {
    if (!fs.existsSync(SHORTS_FILE)) return [];
    const data = fs.readFileSync(SHORTS_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

function saveShorts(shorts: any[]) {
  const tmpPath = `${SHORTS_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    const dir = path.dirname(SHORTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(shorts, null, 2), "utf-8");
    fs.renameSync(tmpPath, SHORTS_FILE);
  } catch (err) {
    console.error("Failed to save shorts:", err);
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

export async function GET() {
  const shorts = getShorts();
  return NextResponse.json({ shorts });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { characterName, caption, videoUrl, avatar } = body || {};

    if (!characterName || !caption || !videoUrl) {
      return NextResponse.json({ error: "Missing required reel fields" }, { status: 400 });
    }

    const shorts = getShorts();
    const newShort = {
      id: "short-" + Date.now(),
      characterId: "custom-" + Date.now(),
      characterName,
      characterAge: 21,
      avatar: avatar || "/characters/zovik_01.jpg",
      videoUrl,
      caption,
      tags: ["Reel", "ZovikShorts", "VIP"],
    };

    shorts.unshift(newShort);
    saveShorts(shorts);

    return NextResponse.json({ success: true, short: newShort });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create short" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    let shorts = getShorts();
    shorts = shorts.filter((s: any) => s.id !== id);
    saveShorts(shorts);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete short" }, { status: 500 });
  }
}
