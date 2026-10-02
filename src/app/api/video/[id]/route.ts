import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const rawId = resolvedParams.id;
    if (!rawId) {
      return new NextResponse("Missing video id", { status: 400 });
    }

    // Path traversal prevention: strip any directory separators or special characters
    const cleanId = rawId.replace(/\.mp4$/i, "").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanId) {
      return new NextResponse("Invalid video id", { status: 400 });
    }

    // Direct redirect to Vercel/Next.js native Edge CDN static file
    // Eliminates Node.js Serverless ReadableStream timeouts and memory leaks
    const companionPath = path.join(process.cwd(), "public", "videos", "companions", `${cleanId}.mp4`);
    if (fs.existsSync(companionPath)) {
      return NextResponse.redirect(new URL(`/videos/companions/${cleanId}.mp4`, request.url), 307);
    }

    const rootVideoPath = path.join(process.cwd(), "public", "videos", `${cleanId}.mp4`);
    if (fs.existsSync(rootVideoPath)) {
      return NextResponse.redirect(new URL(`/videos/${cleanId}.mp4`, request.url), 307);
    }

    return new NextResponse("Video not found", { status: 404 });
  } catch (error: unknown) {
    console.error("[Video Stream Route Error]:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
