import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import AdmZip from "adm-zip";
import path from "path";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { uploadToCloudStorage } from "@/lib/cloudStorage";
import { savePersistentShort, generateUniqueId } from "@/lib/serverDb";
import { ShortReel } from "@/types";

// Security limits to prevent Denial of Service (DoS) & resource exhaustion
const MAX_SINGLE_FILE_BYTES = 50 * 1024 * 1024; // 50MB max for video/image
const MAX_ZIP_FILE_BYTES = 100 * 1024 * 1024;    // 100MB max for zip archive
const MAX_ZIP_ENTRIES = 50;                     // Max 50 files inside zip
const MAX_UNCOMPRESSED_ZIP_BYTES = 250 * 1024 * 1024; // Max 250MB total decompressed size

// Permitted extensions
const ALLOWED_VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/**
 * Validates against Path Traversal / Zip Slip vulnerability
 */
function isPathTraversal(entryName: string): boolean {
  if (!entryName) return true;
  // Check for directory traversal sequences
  if (entryName.includes("..") || entryName.startsWith("/") || entryName.startsWith("\\")) {
    return true;
  }
  const normalized = path.normalize(entryName);
  return normalized.startsWith("..") || path.isAbsolute(normalized);
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminRequest(req)) {
      return NextResponse.json(
        { error: "Unauthorized access: Valid admin credentials required." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetType = (formData.get("type") as string) || "auto"; // "reel" | "image" | "auto"
    const characterName = (formData.get("characterName") as string) || "Zovik AI";
    const caption = (formData.get("caption") as string) || "New live short reel 💕";
    const createReel = formData.get("createReel") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const originalName = file.name.toLowerCase();
    const isZip = originalName.endsWith(".zip");

    // 1. File Size Verification
    if (isZip && file.size > MAX_ZIP_FILE_BYTES) {
      return NextResponse.json(
        { error: `ZIP archive exceeds maximum permitted size (${MAX_ZIP_FILE_BYTES / (1024 * 1024)}MB).` },
        { status: 413 }
      );
    }

    if (!isZip && file.size > MAX_SINGLE_FILE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds maximum permitted size (${MAX_SINGLE_FILE_BYTES / (1024 * 1024)}MB).` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const results: { url: string; type: "video" | "image"; name: string }[] = [];

    // ================= 1. HANDLE ZIP ARCHIVE (HARDENED AGAINST ZIP SLIP & ZIP BOMBS) =================
    if (isZip) {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      // Check entry count limit
      if (zipEntries.length > MAX_ZIP_ENTRIES) {
        return NextResponse.json(
          { error: `Archive contains too many entries (max ${MAX_ZIP_ENTRIES} permitted).` },
          { status: 400 }
        );
      }

      let totalDecompressedBytes = 0;

      for (const entry of zipEntries) {
        if (entry.isDirectory || entry.entryName.includes("__MACOSX") || entry.name.startsWith(".")) {
          continue;
        }

        // Zip Slip / Path Traversal Check
        if (isPathTraversal(entry.entryName) || isPathTraversal(entry.name)) {
          console.warn("[Upload Security] Blocked path traversal attempt in zip entry:", entry.entryName);
          continue;
        }

        // Zip Bomb protection: check uncompressed size
        totalDecompressedBytes += entry.header.size;
        if (totalDecompressedBytes > MAX_UNCOMPRESSED_ZIP_BYTES) {
          return NextResponse.json(
            { error: "Archive uncompressed size exceeds maximum safe limit (250MB)." },
            { status: 413 }
          );
        }

        const ext = path.extname(entry.name).toLowerCase();
        const safeBaseName = entry.name.replace(/[^a-zA-Z0-9._-]/g, "_");

        // Video inside ZIP
        if (ALLOWED_VIDEO_EXTS.has(ext)) {
          const fileName = `reel_${Date.now()}_${safeBaseName}`;
          const videoUrl = await uploadToCloudStorage(
            `videos/shorts/${fileName}`,
            entry.getData(),
            "video/mp4"
          );
          results.push({ url: videoUrl, type: "video", name: entry.name });

          if (createReel || targetType === "reel") {
            const cleanTitle = entry.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
            const shortItem: ShortReel = {
              id: generateUniqueId("short"),
              characterId: generateUniqueId("char"),
              characterName: characterName !== "Zovik AI" ? characterName : cleanTitle,
              characterAge: 22,
              avatar: "/logos/zovik-squircle.svg",
              videoUrl,
              caption: caption || `${cleanTitle} • Exclusive Short Reel`,
              tags: ["ZIP Upload", "VIP Reel"],
            };
            await savePersistentShort(shortItem);
          }
        }

        // Image inside ZIP
        if (ALLOWED_IMAGE_EXTS.has(ext)) {
          const fileName = `char_${Date.now()}_${safeBaseName.replace(/\.[^/.]+$/, "")}.webp`;
          let imgData = entry.getData();
          try {
            imgData = await sharp(entry.getData())
              .resize({ width: 1200, withoutEnlargement: true })
              .webp({ quality: 85 })
              .toBuffer();
          } catch {}

          const imageUrl = await uploadToCloudStorage(
            `characters/${fileName}`,
            imgData,
            "image/webp"
          );
          results.push({ url: imageUrl, type: "image", name: entry.name });
        }
      }

      return NextResponse.json({
        success: true,
        isZip: true,
        totalExtracted: results.length,
        files: results,
      });
    }

    // ================= 2. HANDLE SINGLE VIDEO =================
    const singleExt = path.extname(file.name).toLowerCase();

    if (ALLOWED_VIDEO_EXTS.has(singleExt)) {
      const safeName = `reel_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const videoUrl = await uploadToCloudStorage(
        `videos/shorts/${safeName}`,
        buffer,
        file.type || "video/mp4"
      );

      if (createReel || targetType === "reel") {
        const newReel: ShortReel = {
          id: generateUniqueId("short"),
          characterId: generateUniqueId("char"),
          characterName: characterName.trim() || "Zovik AI",
          characterAge: 22,
          avatar: "/logos/zovik-squircle.svg",
          videoUrl,
          caption: caption.trim() || "Exclusive Short Reel 💕",
          tags: ["Direct Upload", "Live Reel"],
        };
        await savePersistentShort(newReel);

        return NextResponse.json({
          success: true,
          type: "video",
          url: videoUrl,
          reelCreated: true,
          reel: newReel,
        });
      }

      return NextResponse.json({
        success: true,
        type: "video",
        url: videoUrl,
      });
    }

    // ================= 3. HANDLE SINGLE IMAGE =================
    if (ALLOWED_IMAGE_EXTS.has(singleExt)) {
      const safeBase = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `char_${Date.now()}_${safeBase}.webp`;
      let imgData = buffer;
      try {
        imgData = await sharp(buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
      } catch {}

      const imageUrl = await uploadToCloudStorage(
        `characters/${fileName}`,
        imgData,
        "image/webp"
      );

      return NextResponse.json({
        success: true,
        type: "image",
        url: imageUrl,
      });
    }

    return NextResponse.json(
      { error: "Unsupported file type. Permitted formats: MP4, WEBM, MOV, JPG, PNG, WEBP, or ZIP." },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[Upload Processing Note]:", err instanceof Error ? err.message : "Upload error");
    return NextResponse.json({ error: "Secure file upload processing failed." }, { status: 500 });
  }
}
