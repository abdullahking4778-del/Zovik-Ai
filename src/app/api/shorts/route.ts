import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getPersistentShorts,
  savePersistentShort,
  deletePersistentShort,
  generateUniqueId,
} from "@/lib/serverDb";
import { ShortReel } from "@/types";

export async function GET() {
  try {
    const shorts = await getPersistentShorts();
    return NextResponse.json({ success: true, shorts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load shorts";
    console.error("[Shorts GET Error]:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
  }

  try {
    let body: Partial<ShortReel>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { characterName, caption, videoUrl, avatar } = body;

    if (!characterName || !caption || !videoUrl) {
      return NextResponse.json({ success: false, error: "Missing required reel fields" }, { status: 400 });
    }

    const newShort: ShortReel = {
      id: generateUniqueId("short"),
      characterId: generateUniqueId("char"),
      characterName: characterName.trim(),
      characterAge: 21,
      avatar: avatar || "/characters/zovik_01.jpg",
      videoUrl: videoUrl.trim(),
      caption: caption.trim(),
      tags: ["Reel", "ZovikShorts", "VIP"],
      createdAt: new Date().toISOString(),
    };

    await savePersistentShort(newShort);

    return NextResponse.json({ success: true, short: newShort });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create short";
    console.error("[Shorts POST Error]:", err);
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
      return NextResponse.json({ success: false, error: "Missing reel id" }, { status: 400 });
    }

    await deletePersistentShort(id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete short";
    console.error("[Shorts DELETE Error]:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
