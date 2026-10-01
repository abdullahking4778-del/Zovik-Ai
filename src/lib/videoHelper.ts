// Safe Video Stream & Blob URL Helper
// Prevents download managers (like IDM) from intercepting video playback

const blobCache = new Map<string, string>();

/**
 * Converts a raw .mp4 file path into a streaming API endpoint without .mp4 extension
 * e.g. /videos/companions/alexander-sterling.mp4 -> /api/video/alexander-sterling
 */
export function getSafeStreamUrl(src: string): string {
  if (!src) return "";
  if (src.startsWith("blob:")) return src;

  // Extract companion ID from /videos/companions/{id}.mp4 or /videos/{id}.mp4
  const match =
    src.match(/\/videos\/companions\/([^/]+)\.mp4$/i) ||
    src.match(/\/videos\/([^/]+)\.mp4$/i);

  if (match && match[1]) {
    return `/api/video/${match[1]}`;
  }
  return src;
}

/**
 * Fetches the video stream into browser memory and returns a private blob: URL.
 * IDM and external downloaders CANNOT intercept blob: URLs.
 */
export async function fetchVideoBlobUrl(src: string): Promise<string> {
  const streamUrl = getSafeStreamUrl(src);
  if (!streamUrl || streamUrl.startsWith("blob:")) return streamUrl;

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
