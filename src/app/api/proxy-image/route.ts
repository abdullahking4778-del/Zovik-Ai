import { NextRequest, NextResponse } from "next/server";
import { isSafeExternalUrl, isSafeResolvedUrl } from "@/lib/securityUrl";

// Fallback 1x1 transparent or avatar image if remote host completely fails
const FALLBACK_AVATAR = "/characters/zovik_01.jpg";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB max response size to prevent memory DoS
const FETCH_TIMEOUT_MS = 8000; // 8 seconds timeout

/**
 * Fetch external URL safely with manual redirect validation and size limits
 */
async function safeFetchUrl(
  url: string,
  options: RequestInit = {},
  maxRedirects = 3
): Promise<Response> {
  let currentUrl = url;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    if (!isSafeExternalUrl(currentUrl) || !(await isSafeResolvedUrl(currentUrl))) {
      throw new Error("Blocked: Target or redirect URL is not permitted.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(currentUrl, {
        ...options,
        redirect: "manual", // Do NOT follow redirects automatically to prevent SSRF bypass
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle HTTP redirects (301, 302, 307, 308)
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) {
          throw new Error("Redirect response missing location header.");
        }

        const nextUrl = new URL(location, currentUrl).toString();
        if (!isSafeExternalUrl(nextUrl) || !(await isSafeResolvedUrl(nextUrl))) {
          throw new Error("Blocked: Redirect target points to private or restricted network.");
        }

        currentUrl = nextUrl;
        redirectsRemaining--;
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  throw new Error("Too many redirects.");
}

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url");

  if (!targetUrl || !isSafeExternalUrl(targetUrl) || !(await isSafeResolvedUrl(targetUrl))) {
    return new NextResponse("Invalid or blocked URL", { status: 400 });
  }

  try {
    let finalImageUrl = targetUrl;

    // 1. Pinterest URL Handling (pin.it shortlinks or pinterest.com webpages)
    if (
      (targetUrl.includes("pin.it") || targetUrl.includes("pinterest.com")) &&
      !targetUrl.includes("i.pinimg.com")
    ) {
      try {
        const pageRes = await safeFetchUrl(targetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          },
        });

        const contentType = pageRes.headers.get("content-type") || "";

        if (contentType.startsWith("image/")) {
          const buffer = await pageRes.arrayBuffer();
          if (buffer.byteLength > MAX_IMAGE_BYTES) {
            return new NextResponse("Image exceeds maximum allowed size (10MB)", { status: 413 });
          }
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        }

        const html = await pageRes.text();

        const ogMatch =
          html.match(/<meta\s+[^>]*property=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:image|twitter:image|twitter:image:src)["']/i) ||
          html.match(/<meta\s+[^>]*name=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<link\s+[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i) ||
          html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-zA-Z0-9/_.-]+\.(?:jpg|jpeg|png|webp)/i) ||
          html.match(/https:\/\/i\.pinimg\.com\/736x\/[a-zA-Z0-9/_.-]+\.(?:jpg|jpeg|png|webp)/i);

        if (ogMatch && ogMatch[1]) {
          const candidate = ogMatch[1].replace(/&amp;/g, "&");
          if (isSafeExternalUrl(candidate)) {
            finalImageUrl = candidate;
          }
        }
      } catch (err) {
        console.warn("[ProxyImage] Scraping note:", err instanceof Error ? err.message : String(err));
      }
    }

    // Re-verify finalImageUrl before fetching to prevent indirect SSRF
    if (!isSafeExternalUrl(finalImageUrl)) {
      return new NextResponse("Blocked unsafe extracted URL", { status: 400 });
    }

    // 2. Fetch the actual image data safely
    const imgRes = await safeFetchUrl(finalImageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Referer: finalImageUrl.includes("pinimg.com") ? "https://www.pinterest.com/" : "",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!imgRes.ok) {
      return NextResponse.redirect(new URL(FALLBACK_AVATAR, request.url));
    }

    // Check Content-Length header first
    const contentLength = imgRes.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) {
      return new NextResponse("Image exceeds maximum allowed size (10MB)", { status: 413 });
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";

    // Read response with early size enforcement on the incoming stream (prevents memory DoS)
    let buffer: Buffer;
    if (imgRes.body) {
      const reader = imgRes.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let exceeded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > MAX_IMAGE_BYTES) {
            exceeded = true;
            await reader.cancel("Size limit exceeded");
            break;
          }
          chunks.push(value);
        }
      }

      if (exceeded) {
        return new NextResponse("Image exceeds maximum allowed size (10MB)", { status: 413 });
      }
      buffer = Buffer.concat(chunks);
    } else {
      const arrayBuf = await imgRes.arrayBuffer();
      if (arrayBuf.byteLength > MAX_IMAGE_BYTES) {
        return new NextResponse("Image exceeds maximum allowed size (10MB)", { status: 413 });
      }
      buffer = Buffer.from(arrayBuf);
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.warn("[ProxyImage Note]:", error instanceof Error ? error.message : "Fetch aborted");
    return NextResponse.redirect(new URL(FALLBACK_AVATAR, request.url));
  }
}
