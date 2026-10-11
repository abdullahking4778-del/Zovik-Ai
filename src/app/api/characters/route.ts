import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { resolveServerUser } from "@/lib/authSession";
import {
  getAllPersistentCharacters,
  savePersistentCustomCharacter,
  deletePersistentCharacter,
  generateUniqueId,
} from "@/lib/serverDb";
import { Character } from "@/types";
import { getUserWallet, deductCompanionCreationCredits } from "@/lib/wallet/walletService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const characters = await getAllPersistentCharacters();
    return NextResponse.json(
      {
        success: true,
        characters,
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
        success: false,
        characters: [],
        error: "Failed to retrieve characters from database",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = verifyAdminRequest(req);
  const sessionUser = await resolveServerUser(req);

  try {
    let newCharacter: Partial<Character> & { isCustom?: boolean };
    try {
      newCharacter = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 });
    }

    if (!newCharacter || !newCharacter.name) {
      return NextResponse.json({ success: false, error: "Invalid character data: name is required" }, { status: 400 });
    }

    // Non-admins must be authenticated and can only create custom companions
    if (!isAdmin) {
      if (!sessionUser.authenticated) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Sign-in required to create custom companion" },
          { status: 401 }
        );
      }

      const isCustomRequest = Boolean(
        newCharacter.isCustom ||
        newCharacter.category === "Custom" ||
        newCharacter.id?.startsWith("char_custom")
      );
      if (!isCustomRequest) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Admin session required to publish system companions" },
          { status: 401 }
        );
      }
    }

    const charId = newCharacter.id || (isAdmin ? generateUniqueId("char") : generateUniqueId("char_custom"));
    const isVipTier = newCharacter.accessTier === "vip" || newCharacter.accessTier === "plus" || newCharacter.isVipOnly === true;

    const formattedChar: Character = {
      id: charId,
      slug: newCharacter.slug || newCharacter.name.toLowerCase().replace(/\s+/g, "-"),
      name: newCharacter.name.trim(),
      age: Number(newCharacter.age) || 22,
      gender: newCharacter.gender || "female",
      style: newCharacter.style || "realistic",
      tagline: newCharacter.tagline || `${newCharacter.name} • AI Companion`,
      desc: newCharacter.desc || "Custom AI Companion created in Zovik AI.",
      image: newCharacter.image || "/characters/zovik_01.jpg",
      category: newCharacter.category || "Trending",
      badge: newCharacter.badge || (isVipTier ? "VIP" : "NEW"),
      series: !!newCharacter.series,
      verified: true,
      online: true,
      tags: Array.isArray(newCharacter.tags)
        ? newCharacter.tags
        : typeof newCharacter.tags === "string"
        ? (newCharacter.tags as string).split(",").map((t) => t.trim())
        : ["Custom", isVipTier ? "VIP" : "Sweet"],
      voice: newCharacter.voice || "Warm, affectionate voice",
      greeting: newCharacter.greeting || `Hi there! I'm ${newCharacter.name}. Nice to meet you 💕`,
      videoUrl: newCharacter.videoUrl,
      gallery: newCharacter.gallery || [newCharacter.image || "/characters/zovik_01.jpg"],
      messages: newCharacter.messages || [],
      accessTier: isVipTier ? "vip" : "free",
      isVipOnly: isVipTier,
      creatorId: sessionUser.userId || (isAdmin ? "admin" : undefined),
      creatorEmail: sessionUser.userEmail || (isAdmin ? "admin@zovik.ai" : undefined),
    };

    // 100 Coins Wallet Check for Non-Admin Companion Creation
    let remainingCoins: number | undefined = undefined;
    if (!isAdmin && sessionUser.authenticated && sessionUser.userId) {
      const wallet = await getUserWallet(sessionUser.userId);
      if (wallet.balance < 100) {
        return NextResponse.json(
          {
            success: false,
            error: "Aapke paas custom companion create karne ke liye kafi coins nahi hain (100 coins required)",
            coinsRequired: 100,
            currentBalance: wallet.balance,
          },
          { status: 402 }
        );
      }

      const debitRes = await deductCompanionCreationCredits(sessionUser.userId, charId);
      remainingCoins = debitRes.wallet.balance;
    }

    const saved = await savePersistentCustomCharacter(formattedChar);

    return NextResponse.json({ success: true, character: saved, remainingCoins });
  } catch (err: unknown) {
    console.error("[Characters POST Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error adding companion" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized: Admin session required" }, { status: 401 });
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
      accessTier: isVipTier ? "vip" : "free",
      isVipOnly: isVipTier,
      badge: body.badge || (isVipTier ? "VIP" : existing.badge),
    };

    await savePersistentCustomCharacter(updated);

    return NextResponse.json({ success: true, character: updated, message: "Companion updated successfully" });
  } catch (err: unknown) {
    console.error("[Characters PUT Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error updating companion" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const isAdmin = verifyAdminRequest(req);

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing character ID" }, { status: 400 });
    }

    if (!isAdmin) {
      const sessionUser = await resolveServerUser(req);
      if (!sessionUser.authenticated) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Authentication required to delete companions" },
          { status: 401 }
        );
      }

      const all = await getAllPersistentCharacters();
      const target = all.find((c) => c.id.toLowerCase() === id.toLowerCase() || c.slug.toLowerCase() === id.toLowerCase());
      if (!target) {
        return NextResponse.json({ success: false, error: "Companion not found" }, { status: 404 });
      }

      // Non-admins can NEVER delete official companions
      if (!target.id.startsWith("char_custom") && target.category !== "Custom") {
        return NextResponse.json({ success: false, error: "Unauthorized: You cannot delete official companions" }, { status: 403 });
      }

      // Enforce ownership: If target has a creatorId or creatorEmail, verify caller owns it
      const isOwner = Boolean(
        (target.creatorId && sessionUser.userId && target.creatorId === sessionUser.userId) ||
        (target.creatorEmail && sessionUser.userEmail && target.creatorEmail.toLowerCase() === sessionUser.userEmail.toLowerCase())
      );

      const hasCreatorInfo = Boolean(target.creatorId || target.creatorEmail);
      if (!isOwner && (hasCreatorInfo || !isAdmin)) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You do not have permission to delete this companion" },
          { status: 403 }
        );
      }
    }

    await deletePersistentCharacter(id);

    return NextResponse.json({ success: true, message: "Companion deleted successfully" });
  } catch (err: unknown) {
    console.error("[Characters DELETE Error]:", err);
    return NextResponse.json({ success: false, error: "Internal server error deleting companion" }, { status: 500 });
  }
}
