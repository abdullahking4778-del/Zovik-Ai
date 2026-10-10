import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { isSafeExternalUrl } from "@/lib/securityUrl";

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

    // 1. External Video Proxy Support (Prevents IDM interception on external CDN links like Catbox / Cloudinary)
    if (rawId === "proxy") {
      const targetUrl = request.nextUrl.searchParams.get("url");
      if (!targetUrl || !isSafeExternalUrl(targetUrl)) {
        return new NextResponse("Invalid or blocked proxy URL", { status: 400 });
      }

      const rangeHeader = request.headers.get("range");
      const fetchHeaders: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ZovikVideo/1.0",
      };
      if (rangeHeader) {
        fetchHeaders["range"] = rangeHeader;
      }

      const externalResponse = await fetch(targetUrl, { headers: fetchHeaders });
      if (!externalResponse.ok && externalResponse.status !== 206) {
        return new NextResponse("Failed to fetch external video stream", {
          status: externalResponse.status,
        });
      }

      const headers = new Headers();
      headers.set("Content-Type", externalResponse.headers.get("content-type") || "video/mp4");
      headers.set("Content-Disposition", "inline");
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

      if (externalResponse.headers.get("content-range")) {
        headers.set("Content-Range", externalResponse.headers.get("content-range")!);
      }
      if (externalResponse.headers.get("content-length")) {
        headers.set("Content-Length", externalResponse.headers.get("content-length")!);
      }

      return new NextResponse(externalResponse.body, {
        status: externalResponse.status,
        headers,
      });
    }

    // 2. Local Video Streaming Support
    // Path traversal prevention: strip any directory separators or special characters
    const cleanId = rawId.replace(/\.mp4$/i, "").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanId) {
      return new NextResponse("Invalid video id", { status: 400 });
    }

    // Search in priority locations:
    // 1. Companion intro videos
    // 2. Shorts reels
    // 3. Root videos
    const candidatePaths = [
      path.join(process.cwd(), "public", "videos", "companions", `${cleanId}.mp4`),
      path.join(process.cwd(), "public", "videos", "shorts", `${cleanId}.mp4`),
      path.join(process.cwd(), "public", "videos", `${cleanId}.mp4`),
    ];

    let foundPath: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      return new NextResponse("Video not found", { status: 404 });
    }

    const stat = fs.statSync(/*turbopackIgnore: true*/ foundPath);
    const fileSize = stat.size;
    const range = request.headers.get("range");

    // Range Request Handling (Smooth scrubbing, instant playback, zero IDM popups)
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const nodeStream = fs.createReadStream(/*turbopackIgnore: true*/ foundPath, { start, end });
      const webStream = Readable.toWeb(nodeStream);

      return new NextResponse(webStream as unknown as BodyInit, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": "video/mp4",
          "Content-Disposition": "inline",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Full file stream response
    const nodeStream = fs.createReadStream(/*turbopackIgnore: true*/ foundPath);
    const webStream = Readable.toWeb(nodeStream);

    return new NextResponse(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Length": String(fileSize),
        "Content-Type": "video/mp4",
        "Content-Disposition": "inline",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: unknown) {
    console.error("[Video Stream Route Error]:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
