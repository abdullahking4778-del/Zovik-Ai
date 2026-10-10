import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { uploadToSupabaseStorage, isSupabaseConfigured } from "./supabase";
import sharp from "sharp";

/**
 * Universal Zero-Budget Cloud Storage Engine
 * 1. Primary: Supabase Cloud Storage (100% Free, Zero Card, Permanent Public CDN URLs)
 * 2. Secondary: Firebase Cloud Storage (if enabled)
 * 3. Fallback: Ultra-compact WebP Data-URL (<50KB) storing directly in DB records.
 */
export async function uploadToCloudStorage(
  storagePath: string,
  data: Buffer | string,
  contentType: string = "image/webp"
): Promise<string> {
  const cleanPath = storagePath.replace(/^\/+/, "");

  // Convert input to Buffer if needed
  let inputBuffer: Buffer;
  if (typeof data === "string") {
    const base64Data = data.includes(",") ? data.split(",")[1] : data;
    inputBuffer = Buffer.from(base64Data, "base64");
  } else {
    inputBuffer = data;
  }

  // 1. Primary: Upload directly to Supabase Cloud Storage (Bucket: 'zovik-media')
  if (isSupabaseConfigured()) {
    try {
      // If it's an image, optimize before uploading to keep storage super light
      let bufferToUpload = inputBuffer;
      if (contentType.startsWith("image/")) {
        try {
          bufferToUpload = await sharp(inputBuffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          contentType = "image/webp";
        } catch {}
      }

      const supabaseUrl = await uploadToSupabaseStorage(
        "zovik-media",
        cleanPath.endsWith(".webp") || !cleanPath.includes(".") ? `${cleanPath}.webp` : cleanPath,
        bufferToUpload,
        contentType
      );

      if (supabaseUrl) {
        return supabaseUrl;
      }
    } catch (err) {
      console.warn("[CloudStorage] Supabase upload failed, falling back:", err);
    }
  }

  // 2. Secondary: Try Firebase Cloud Storage
  try {
    const storageRef = ref(storage, cleanPath);
    if (typeof data === "string") {
      const uploadFormat = data.startsWith("data:") ? "data_url" : "base64";
      await uploadString(storageRef, data, uploadFormat, { contentType });
    } else {
      await uploadBytes(storageRef, data, { contentType });
    }
    const publicUrl = await getDownloadURL(storageRef);
    return publicUrl;
  } catch {
    // 3. Fallback: Save to Local Public Directory (Zero-budget & Local Network)
    try {
      const fs = require("fs");
      const path = require("path");
      
      const publicDir = path.join(process.cwd(), "public");
      const localFilePath = path.join(publicDir, cleanPath);
      const localDir = path.dirname(localFilePath);
      
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      
      if (contentType.startsWith("image/")) {
        const compressedWebp = await sharp(inputBuffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        
        fs.writeFileSync(localFilePath, compressedWebp);
      } else {
        fs.writeFileSync(localFilePath, inputBuffer);
      }
      
      return `/${cleanPath}`;
    } catch (localErr) {
      console.warn("[CloudStorage] Local fallback failed:", localErr);
      
      // 4. Final Fallback: Compress to ultra-compact WebP Data URL (<50KB) (only for images)
      if (contentType.startsWith("image/")) {
        try {
          const compressedWebp = await sharp(inputBuffer)
            .resize({ width: 800, withoutEnlargement: true })
            .webp({ quality: 70 })
            .toBuffer();
  
          return `data:image/webp;base64,${compressedWebp.toString("base64")}`;
        } catch (sharpErr) {
          console.warn("[CloudStorage] Sharp compression note:", sharpErr);
          if (typeof data === "string" && data.startsWith("data:")) {
            return data;
          }
        }
      }
  
      if (typeof data === "string" && (data.startsWith("http://") || data.startsWith("https://") || data.startsWith("data:"))) {
        return data;
      }
  
      throw new Error("Cloud Storage upload failed and local fallback failed.");
    }
  }
}
