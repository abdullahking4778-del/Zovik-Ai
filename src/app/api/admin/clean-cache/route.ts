import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { cleanAppCacheAndJunk } from "@/lib/maintenanceCleaner";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const result = cleanAppCacheAndJunk();
    return NextResponse.json({
      success: true,
      message: `System cache & junk cleaned successfully! Removed ${result.tmpFilesRemoved} temp files, purged ${result.cachesPurged} stale caches, freed ${(result.bytesFreed / 1024).toFixed(1)} KB.`,
      result,
    });
  } catch (err: unknown) {
    console.error("[CleanCache POST Error]:", err);
    return NextResponse.json(
      { error: "Internal server error during cache cleanup." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  const groqReady = Boolean(
    process.env.GROQ_API_KEY ||
    process.env.GROQ_API_KEYS ||
    process.env.GROQ_API_KEY_1 ||
    process.env.GROQ_API_KEY_2
  );
  const supabaseReady = isSupabaseConfigured();

  return NextResponse.json({
    success: true,
    status: groqReady ? "healthy" : "warning",
    services: {
      groq: groqReady ? "ready" : "unconfigured",
      supabase: supabaseReady ? "ready" : "unconfigured",
      storage: "ready",
    },
    timestamp: new Date().toISOString(),
  });
}
