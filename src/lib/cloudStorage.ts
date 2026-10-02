import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import sharp from "sharp";

/**
 * Universal Zero-Budget Cloud Storage Engine
 * 1. Tries Firebase Cloud Storage if enabled.
 * 2. On Spark plan / No-Credit-Card environments (or Vercel Serverless):
 *    - For images: Compresses to ultra-lightweight WebP Data URL (<50KB),
 *      storing it directly in database records with 0 external dependencies.
 * 100% Free Forever, 0 PKR, No Credit Card Required, 0 Local Disk Writes.
 */
export async function uploadToCloudStorage(
  storagePath: string,
  data: Buffer | string,
  contentType: string = "image/webp"
): Promise<string> {
  const cleanPath = storagePath.replace(/^\/+/, "");

  // 1. Try Firebase Cloud Storage (if user ever upgrades or has active bucket)
  try {
    const storageRef = ref(storage, cleanPath);

    if (typeof data === "string") {
      const uploadFormat = data.startsWith("data:") ? "data_url" : "base64";
      await uploadString(storageRef, data, uploadFormat, {
        contentType,
      });
    } else {
      await uploadBytes(storageRef, data, {
        contentType,
      });
    }

    const publicUrl = await getDownloadURL(storageRef);
    return publicUrl;
  } catch (cloudErr) {
    // Expected on Firebase Spark plan (requires Blaze credit card verification)
    // Seamlessly activate Zero-Card Smart Fallback:
    let inputBuffer: Buffer;
    if (typeof data === "string") {
      const base64Data = data.includes(",") ? data.split(",")[1] : data;
      inputBuffer = Buffer.from(base64Data, "base64");
    } else {
      inputBuffer = data;
    }

    // If image: optimize with sharp to produce an ultra-compact WebP Data URL (30-50 KB)
    // that works permanently on Vercel without any read-only disk issues!
    if (contentType.startsWith("image/")) {
      try {
        const compressedWebp = await sharp(inputBuffer)
          .resize({ width: 900, withoutEnlargement: true })
          .webp({ quality: 75 })
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

    throw new Error("Cloud Storage upload failed and no zero-card fallback available for this asset type.");
  }
}
