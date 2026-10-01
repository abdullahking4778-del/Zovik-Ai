import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import fs from "fs";
import path from "path";

/**
 * Universal Zero-Budget Cloud Storage Engine
 * Uploads media to Firebase Cloud Storage (5 GB Free Forever).
 * Seamlessly falls back to local disk storage if Firebase is unreachable.
 */
export async function uploadToCloudStorage(
  storagePath: string,
  data: Buffer | string,
  contentType: string = "image/webp"
): Promise<string> {
  const cleanPath = storagePath.replace(/^\/+/, "");

  // 1. Try Firebase Cloud Storage (100% Vercel & Cloud Compatible)
  try {
    const storageRef = ref(storage, cleanPath);

    if (typeof data === "string") {
      // Data URL or raw base64 string
      const uploadFormat = data.startsWith("data:") ? "data_url" : "base64";
      await uploadString(storageRef, data, uploadFormat, {
        contentType,
      });
    } else {
      // Buffer / Uint8Array
      await uploadBytes(storageRef, data, {
        contentType,
      });
    }

    const publicUrl = await getDownloadURL(storageRef);
    return publicUrl;
  } catch (cloudErr) {
    console.warn(`[CloudStorage] Firebase upload failed for ${cleanPath}, using local fallback:`, cloudErr);

    // 2. Safe Local Fallback
    try {
      const localRelativePath = `/uploads/${cleanPath}`;
      const localDiskPath = path.join(process.cwd(), "public", "uploads", cleanPath);
      const dir = path.dirname(localDiskPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (typeof data === "string") {
        const base64Data = data.includes(",") ? data.split(",")[1] : data;
        fs.writeFileSync(localDiskPath, Buffer.from(base64Data, "base64"));
      } else {
        fs.writeFileSync(localDiskPath, data);
      }

      return localRelativePath;
    } catch (localErr) {
      console.error("[CloudStorage] Local fallback failed as well:", localErr);
      // Return placeholder or original path
      return `/uploads/${cleanPath}`;
    }
  }
}
