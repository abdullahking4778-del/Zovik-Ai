import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import AdmZip from "adm-zip";
import { verifyAdminRequest } from "@/lib/adminAuth";

const SHORTS_FILE = path.join(process.cwd(), "src", "data", "shorts.json");

function getShorts() {
  try {
    if (!fs.existsSync(SHORTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(SHORTS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveShorts(shorts: any[]) {
  const tmpPath = `${SHORTS_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(shorts, null, 2), "utf-8");
    fs.renameSync(tmpPath, SHORTS_FILE);
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

    // Prepare destination directories
    const shortsDir = path.join(process.cwd(), "public", "videos", "shorts");
    const charsDir = path.join(process.cwd(), "public", "characters");
    if (!fs.existsSync(shortsDir)) fs.mkdirSync(shortsDir, { recursive: true });
    if (!fs.existsSync(charsDir)) fs.mkdirSync(charsDir, { recursive: true });

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
          const destPath = path.join(shortsDir, fileName);
          fs.writeFileSync(destPath, entry.getData());
          const videoUrl = `/videos/shorts/${fileName}`;
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
          const destPath = path.join(charsDir, fileName);
          
          try {
            await sharp(entry.getData())
              .resize({ width: 1200, withoutEnlargement: true })
              .webp({ quality: 85 })
              .toFile(destPath);

            results.push({
              url: `/characters/${fileName}`,
              type: "image",
              name: entry.name,
            });
          } catch {
            // Fallback raw copy if sharp fails on corrupt format
            const rawPath = path.join(charsDir, fileName);
            fs.writeFileSync(rawPath, entry.getData());
            results.push({ url: `/characters/${fileName}`, type: "image", name: entry.name });
          }
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
      const destPath = path.join(shortsDir, safeName);
      fs.writeFileSync(destPath, buffer);
      const videoUrl = `/videos/shorts/${safeName}`;

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
      const destPath = path.join(charsDir, fileName);

      try {
        await sharp(buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(destPath);
      } catch {
        fs.writeFileSync(destPath, buffer);
      }

      const imageUrl = `/characters/${fileName}`;
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
