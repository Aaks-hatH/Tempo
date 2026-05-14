"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

// ─── URL extraction ───────────────────────────────────────────────────────────

const URL_RE =
  /(?:^|\s)(https?:\/\/(?:[-\w]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;

export function extractUrls(text: string): string[] {
  const found: string[] = [];
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    found.push(m[1]);
  }
  return [...new Set(found)];
}

// ─── Hover tooltip ────────────────────────────────────────────────────────────

interface TooltipData {
  favicon: string;
  title: string;
  domain: string;
}

function LinkTooltip({ href, children }: { href: string; children: React.ReactNode }) {
  const [tip, setTip] = useState<TooltipData | null>(null);
  const [visible, setVisible] = useState(false);
  const fetchedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setVisible(true), 150);
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch(`/api/link-preview?url=${encodeURIComponent(href)}`)
      .then((r) => r.json())
      .then((d) => {
        setTip({ favicon: d.favicon ?? "", title: d.title ?? d.domain, domain: d.domain });
      })
      .catch(() => {
        try {
          const u = new URL(href);
          setTip({
            favicon: `https://www.google.com/s2/favicons?domain=${u.origin}&sz=32`,
            title: u.hostname,
            domain: u.hostname,
          });
        } catch { /* noop */ }
      });
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  let domain = href;
  try { domain = new URL(href).hostname; } catch { /* noop */ }

  return (
    <span className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline underline-offset-2 decoration-blue-400/50 hover:text-blue-300 hover:decoration-blue-300 transition-colors inline-flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <ExternalLink className="size-2.5 shrink-0 opacity-60" />
      </a>

      {/* Hover popup */}
      {visible && (
        <span
          className="absolute bottom-full left-0 z-50 mb-2 min-w-44 max-w-64 rounded-xl border border-white/10 bg-black/95 p-2.5 shadow-2xl backdrop-blur-xl pointer-events-none"
          style={{ animation: "fadeInUp 0.12s ease" }}
        >
          <span className="flex items-center gap-2">
            {tip?.favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tip.favicon}
                alt=""
                width={14}
                height={14}
                className="size-3.5 rounded-sm shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <span className="size-3.5 rounded-sm bg-slate-700 shrink-0" />
            )}
            <span className="truncate text-xs font-medium text-white">
              {tip?.title ?? domain}
            </span>
          </span>
          <span className="mt-1 block truncate text-[10px] text-slate-500">
            {tip?.domain ?? domain}
          </span>
        </span>
      )}
    </span>
  );
}

// ─── Text → React nodes with clickable links ──────────────────────────────────

export function LinkRenderer({ text, className }: { text: string; className?: string }) {
  if (!text) return null;

  URL_RE.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = URL_RE.exec(text)) !== null) {
    const fullMatch = m[0];       // may start with whitespace
    const url = m[1];
    const urlStart = m.index + (fullMatch.length - url.length);

    // Text before the URL (include any leading space that was in fullMatch)
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    // Leading space/char before URL that was captured in m[0] but not m[1]
    const prefix = fullMatch.slice(0, fullMatch.length - url.length);
    if (prefix) parts.push(prefix);

    parts.push(
      <LinkTooltip key={urlStart} href={url}>
        {url.length > 50 ? url.slice(0, 47) + "…" : url}
      </LinkTooltip>,
    );
    lastIndex = m.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}

// ─── OG preview card (shown below a chat message) ────────────────────────────

export interface OgData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  domain: string;
}

export function LinkPreviewCard({ data }: { data: OgData }) {
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex overflow-hidden rounded-2xl border border-white/10 bg-black/95 transition-colors hover:border-white/20 hover:bg-white/5 max-w-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          className="h-20 w-28 shrink-0 object-cover"
          onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
        />
      )}
      <div className="flex min-w-0 flex-col justify-center gap-1 p-3">
        <div className="flex items-center gap-1.5">
          {data.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.favicon}
              alt=""
              width={12}
              height={12}
              className="size-3 rounded-sm shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <span className="truncate text-[10px] text-slate-500">{data.domain}</span>
        </div>
        {data.title && (
          <p className="line-clamp-1 text-xs font-medium text-slate-200">{data.title}</p>
        )}
        {data.description && (
          <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}

// ─── Hook: fetch OG previews for a batch of URLs ─────────────────────────────

export function useLinkPreviews(urls: string[]) {
  const [previews, setPreviews] = useState<Record<string, OgData>>({});
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const toFetch = urls.filter((u) => !fetchedRef.current.has(u));
    if (toFetch.length === 0) return;
    toFetch.forEach((url) => {
      fetchedRef.current.add(url);
      fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
        .then((r) => r.json())
        .then((d: OgData) => {
          setPreviews((prev) => ({ ...prev, [url]: d }));
        })
        .catch(() => { /* noop */ });
    });
  }, [urls]);

  return previews;
}
