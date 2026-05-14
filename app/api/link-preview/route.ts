import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function extractMeta(html: string, property: string): string | null {
  // og: / twitter: property attributes
  const propMatch = html.match(
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
  );
  if (propMatch) return propMatch[1];
  const contentMatch = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    ),
  );
  return contentMatch ? contentMatch[1] : null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function extractFavicon(html: string, baseUrl: string): string {
  // Try link[rel~=icon] tags
  const linkMatch = html.match(
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
  );
  if (linkMatch) {
    const href = linkMatch[1];
    if (href.startsWith("http")) return href;
    const base = new URL(baseUrl);
    return href.startsWith("/") ? `${base.origin}${href}` : `${base.origin}/${href}`;
  }
  // Fallback to google favicon service (avoids direct fetch)
  const origin = new URL(baseUrl).origin;
  return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TempoBot/1.0; +https://tempo.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      // Not HTML – return minimal metadata
      return NextResponse.json({
        url,
        title: parsed.hostname,
        description: null,
        image: null,
        favicon: `https://www.google.com/s2/favicons?domain=${parsed.origin}&sz=32`,
        domain: parsed.hostname,
      });
    }

    // Read only first 64KB – enough for <head>
    const reader = res.body?.getReader();
    if (!reader) throw new Error("no body");
    let html = "";
    const decoder = new TextDecoder();
    const limit = 65_536;
    let received = 0;
    while (received < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      received += value.byteLength;
    }
    reader.cancel();

    const ogTitle = extractMeta(html, "og:title");
    const twitterTitle = extractMeta(html, "twitter:title");
    const pageTitle = extractTitle(html);

    const ogDesc = extractMeta(html, "og:description");
    const twitterDesc = extractMeta(html, "twitter:description");
    const metaDesc = extractMeta(html, "description");

    const ogImage = extractMeta(html, "og:image");
    const twitterImage = extractMeta(html, "twitter:image");

    const finalImage = ogImage ?? twitterImage ?? null;
    // Resolve relative image URLs
    let resolvedImage: string | null = finalImage;
    if (finalImage && !finalImage.startsWith("http")) {
      try {
        resolvedImage = new URL(finalImage, url).href;
      } catch {
        resolvedImage = null;
      }
    }

    return NextResponse.json({
      url,
      title: ogTitle ?? twitterTitle ?? pageTitle ?? parsed.hostname,
      description: ogDesc ?? twitterDesc ?? metaDesc ?? null,
      image: resolvedImage,
      favicon: extractFavicon(html, url),
      domain: parsed.hostname,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json(
      {
        url,
        title: parsed.hostname,
        description: null,
        image: null,
        favicon: `https://www.google.com/s2/favicons?domain=${parsed.origin}&sz=32`,
        domain: parsed.hostname,
        error: msg,
      },
      { status: 200 }, // Return 200 with fallback so UI still renders
    );
  }
}
