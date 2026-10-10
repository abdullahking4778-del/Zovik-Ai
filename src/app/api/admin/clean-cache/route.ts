import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { cleanAppCacheAndJunk } from "@/lib/maintenanceCleaner";

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

  return NextResponse.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
