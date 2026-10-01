import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import AdmZip from "adm-zip";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { uploadToCloudStorage } from "@/lib/cloudStorage";

function getShortsFilePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_shorts.json");
  }
  return path.join(process.cwd(), "src", "data", "shorts.json");
}

function getShorts() {
  try {
    const filePath = getShortsFilePath();
    if (!fs.existsSync(filePath)) {
      const fallback = path.join(process.cwd(), "src", "data", "shorts.json");
      if (fs.existsSync(fallback)) {
        return JSON.parse(fs.readFileSync(fallback, "utf-8") || "[]");
      }
      return [];
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8") || "[]");
  } catch {
    return [];
  }
}

function saveShorts(shorts: any[]) {
  const filePath = getShortsFilePath();
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(shorts, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error("Failed to save shorts:", err);
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminRequest(req)) {
      return NextResponse.json({ error: "Unauthorized access: Valid admin token required" }, { status: 401 });
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name.toLowerCase();

    const results: { url: string; type: "video" | "image"; name: string }[] = [];

    // ================= 1. HANDLE ZIP ARCHIVE =================
    if (originalName.endsWith(".zip")) {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      const shortsList = getShorts();

      for (const entry of zipEntries) {
        if (entry.isDirectory || entry.entryName.includes("__MACOSX") || entry.name.startsWith(".")) {
          continue;
        }

        const entryName = entry.name.toLowerCase();
        const safeBaseName = entry.name.replace(/[^a-zA-Z0-9._-]/g, "_");

        // Video inside ZIP
        if (entryName.endsWith(".mp4") || entryName.endsWith(".webm") || entryName.endsWith(".mov")) {
          const fileName = `reel_${Date.now()}_${safeBaseName}`;
          const videoUrl = await uploadToCloudStorage(
            `videos/shorts/${fileName}`,
            entry.getData(),
            "video/mp4"
          );
          results.push({ url: videoUrl, type: "video", name: entry.name });

          if (createReel || targetType === "reel") {
            const cleanTitle = entry.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
            shortsList.unshift({
              id: "short-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
              characterId: "custom-" + Date.now(),
              characterName: characterName !== "Zovik AI" ? characterName : cleanTitle,
              characterAge: 22,
              avatar: "/logos/zovik-squircle.svg",
              videoUrl,
              caption: caption || `${cleanTitle} • Exclusive Short Reel`,
              tags: ["ZIP Upload", "VIP Reel"],
            });
          }
        }

        // Image inside ZIP
        if (entryName.endsWith(".jpg") || entryName.endsWith(".jpeg") || entryName.endsWith(".png") || entryName.endsWith(".webp")) {
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

      if (createReel || targetType === "reel") {
        saveShorts(shortsList);
      }

      return NextResponse.json({
        success: true,
        isZip: true,
        totalExtracted: results.length,
        files: results,
      });
    }

    // ================= 2. HANDLE SINGLE VIDEO =================
    if (
      originalName.endsWith(".mp4") ||
      originalName.endsWith(".webm") ||
      originalName.endsWith(".mov") ||
      originalName.endsWith(".m4v")
    ) {
      const safeName = `reel_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const videoUrl = await uploadToCloudStorage(
        `videos/shorts/${safeName}`,
        buffer,
        file.type || "video/mp4"
      );

      if (createReel || targetType === "reel") {
        const shortsList = getShorts();
        const newReel = {
          id: "short-" + Date.now(),
          characterId: "custom-" + Date.now(),
          characterName: characterName.trim() || "Zovik AI",
          characterAge: 22,
          avatar: "/logos/zovik-squircle.svg",
          videoUrl,
          caption: caption.trim() || "Exclusive Short Reel 💕",
          tags: ["Direct Upload", "Live Reel"],
        };
        shortsList.unshift(newReel);
        saveShorts(shortsList);

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
    if (
      originalName.endsWith(".jpg") ||
      originalName.endsWith(".jpeg") ||
      originalName.endsWith(".png") ||
      originalName.endsWith(".webp")
    ) {
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
      { error: "Unsupported file type. Please upload MP4, WEBM, JPG, PNG, or a .ZIP archive." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
