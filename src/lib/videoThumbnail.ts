/**
 * Extracts a high-definition JPEG / WebP thumbnail data URL directly from a Video File or Video URL.
 * Uses client-side offscreen HTML5 Video & Canvas element.
 */
export async function captureVideoFrame(
  source: File | string,
  timeInSeconds: number = 0.5
): Promise<string> {
  if (typeof window === "undefined") return "";

  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      let objectUrl: string | null = null;

      if (typeof source === "string") {
        video.src = source;
      } else {
        objectUrl = URL.createObjectURL(source);
        video.src = objectUrl;
      }

      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.preload = "metadata";

      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        video.removeAttribute("src");
        video.load();
      };

      video.onloadedmetadata = () => {
        // Clamp seek time within video duration
        const targetTime = Math.min(
          timeInSeconds,
          video.duration > 0.3 ? video.duration - 0.1 : 0.1
        );
        video.currentTime = targetTime;
      };

      video.onseeked = () => {
        try {
          const width = video.videoWidth || 720;
          const height = video.videoHeight || 1280;

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
            cleanup();
            resolve(dataUrl);
            return;
          }
        } catch {
          // If tainted canvas or extraction fails
        }
        cleanup();
        resolve("");
      };

      video.onerror = () => {
        cleanup();
        resolve("");
      };

      // Fallback timeout in case seeked event hangs
      setTimeout(() => {
        cleanup();
        resolve("");
      }, 4000);
    } catch {
      resolve("");
    }
  });
}

/**
 * Converts a base64 Data URL to a File object for multipart upload
 */
export function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const arr = dataUrl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
}
