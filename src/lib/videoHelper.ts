// Safe Video Stream & Blob URL Helper
// Prevents download managers (like IDM) from intercepting video playback

const blobCache = new Map<string, string>();

/**
 * Converts a raw .mp4 file path or external CDN URL into a streaming API endpoint without .mp4 extension
 * e.g. /videos/companions/alexander-sterling.mp4 -> /api/video/alexander-sterling
 * e.g. /videos/shorts/reel_123.mp4 -> /api/video/reel_123
 * e.g. https://files.catbox.moe/abc.mp4 -> /api/video/proxy?url=...
 */
export function getSafeStreamUrl(src: string): string {
  if (!src) return "";
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;

  // 1. External Video URLs (Proxy via server to strip .mp4 interception and add inline headers)
  if (src.startsWith("http://") || src.startsWith("https://")) {
    if (src.includes(".mp4") || src.includes(".webm") || src.includes("catbox") || src.includes("cloudinary")) {
      return `/api/video/proxy?url=${encodeURIComponent(src)}`;
    }
    return src;
  }

  // 2. Extract shorts reel or companion ID
  const match =
    src.match(/\/videos\/shorts\/([^/]+)\.mp4$/i) ||
    src.match(/\/videos\/companions\/([^/]+)\.mp4$/i) ||
    src.match(/\/videos\/([^/]+)\.mp4$/i);

  if (match && match[1]) {
    return `/api/video/${match[1]}`;
  }

  return src;
}

/**
 * Fetches the video stream into browser memory and returns a private blob: URL.
 * IDM and external downloaders CANNOT intercept blob: URLs because they are internal RAM references.
 */
export async function fetchVideoBlobUrl(src: string): Promise<string> {
  if (!src) return "";
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;

  const streamUrl = getSafeStreamUrl(src);

  if (blobCache.has(streamUrl)) {
    return blobCache.get(streamUrl)!;
  }

  try {
    const res = await fetch(streamUrl);
    if (!res.ok) return streamUrl;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    blobCache.set(streamUrl, blobUrl);
    return blobUrl;
  } catch {
    return streamUrl;
  }
}
