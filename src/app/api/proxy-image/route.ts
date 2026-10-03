import { NextRequest, NextResponse } from "next/server";

// Fallback 1x1 transparent or avatar image if remote host completely fails
const FALLBACK_AVATAR = "/characters/zovik_01.jpg";

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url");

  if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    let finalImageUrl = targetUrl;

    // 1. Pinterest URL Handling (pin.it shortlinks or pinterest.com webpages)
    // When a user copies a pin link, it's an HTML page. We extract the actual high-res image URL.
    if (
      (targetUrl.includes("pin.it") || targetUrl.includes("pinterest.com")) &&
      !targetUrl.includes("i.pinimg.com")
    ) {
      try {
        const pageRes = await fetch(targetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          },
          redirect: "follow",
        });

        const contentType = pageRes.headers.get("content-type") || "";

        // If the URL unexpectedly directly returned an image
        if (contentType.startsWith("image/")) {
          const buffer = await pageRes.arrayBuffer();
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        }

        // Parse HTML to extract Pinterest high-res image
        const html = await pageRes.text();

        // Check OpenGraph image meta tags or link tags
        const ogMatch =
          html.match(/<meta\s+[^>]*property=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:image|twitter:image|twitter:image:src)["']/i) ||
          html.match(/<meta\s+[^>]*name=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<link\s+[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i) ||
          html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-zA-Z0-9/_.-]+\.(?:jpg|jpeg|png|webp)/i) ||
          html.match(/https:\/\/i\.pinimg\.com\/736x\/[a-zA-Z0-9/_.-]+\.(?:jpg|jpeg|png|webp)/i);

        if (ogMatch && ogMatch[1]) {
          finalImageUrl = ogMatch[1].replace(/&amp;/g, "&");
        } else if (ogMatch && ogMatch[0] && ogMatch[0].startsWith("http")) {
          finalImageUrl = ogMatch[0].replace(/&amp;/g, "&");
        }
      } catch (err) {
        console.warn("[ProxyImage] Pinterest HTML scraping error:", err);
      }
    }

    // 2. Fetch the actual image data bypassing anti-hotlinking headers
    const imgRes = await fetch(finalImageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Referer: finalImageUrl.includes("pinimg.com") ? "https://www.pinterest.com/" : "",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!imgRes.ok) {
      console.warn(`[ProxyImage] Image fetch returned status ${imgRes.status} for ${finalImageUrl}`);
      // Redirect to local fallback rather than breaking with 500
      return NextResponse.redirect(new URL(FALLBACK_AVATAR, request.url));
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buffer = await imgRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[ProxyImage Error]:", error);
    return NextResponse.redirect(new URL(FALLBACK_AVATAR, request.url));
  }
}
