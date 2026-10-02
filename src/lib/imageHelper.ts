// Safe Image URL Helper
// Resolves local images, direct CDN links, and Pinterest pins/shortlinks

export function getSafeImageUrl(src: string | null | undefined, fallback = "/characters/zovik_01.jpg"): string {
  if (!src || typeof src !== "string" || !src.trim()) {
    return fallback;
  }

  const clean = src.trim();

  // 1. Data URLs & Blob URLs (in-memory)
  if (clean.startsWith("data:") || clean.startsWith("blob:")) {
    return clean;
  }

  // 2. Local public paths
  if (clean.startsWith("/")) {
    return clean;
  }

  // 3. External Pinterest Links (pin.it shortlinks, pinterest.com webpages, or i.pinimg.com images)
  // These MUST be proxied because:
  // - pin.it is an HTML page redirecting to a pin page (needs og:image extraction)
  // - i.pinimg.com blocks cross-origin requests from localhost (HTTP 403 Forbidden)
  if (
    clean.includes("pin.it") ||
    clean.includes("pinterest.com") ||
    clean.includes("i.pinimg.com") ||
    clean.includes("pinimg.com")
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(clean)}`;
  }

  // 4. Catbox, Imgur, or other external image hosts that may block referrers
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    // If it's a known hotlink-protected host or non-image URL, proxy it
    if (clean.includes("catbox.moe") || clean.includes("imgur.com") || clean.includes("cloudinary.com")) {
      return `/api/proxy-image?url=${encodeURIComponent(clean)}`;
    }
    return clean;
  }

  return fallback;
}
