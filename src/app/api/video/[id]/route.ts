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

    // Locate video file in public/videos/companions/ or public/videos/
    const companionPath = path.join(process.cwd(), "public", "videos", "companions", `${cleanId}.mp4`);
    const rootVideoPath = path.join(process.cwd(), "public", "videos", `${cleanId}.mp4`);

    let filePath = "";
    if (fs.existsSync(companionPath)) {
      filePath = companionPath;
    } else if (fs.existsSync(rootVideoPath)) {
      filePath = rootVideoPath;
    } else {
      return new NextResponse("Video not found", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = request.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // RFC 7233 416 Range Not Satisfiable guard
      if (isNaN(start) || start < 0 || start >= fileSize || end < start) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      if (end >= fileSize) {
        end = fileSize - 1;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": "video/mp4",
          "Content-Disposition": 'inline; filename="stream"',
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } else {
      const fileStream = fs.createReadStream(filePath);
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(webStream as any, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": "video/mp4",
          "Content-Disposition": 'inline; filename="stream"',
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch (error) {
    console.error("Video stream error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
