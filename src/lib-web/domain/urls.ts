const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

/** Strip common trailing punctuation from captured URLs. */
function cleanUrl(raw: string): string {
  return raw.replace(/[.,;:!?)]+$/g, "");
}

/**
 * Extract unique http(s) URLs from free text (prompt).
 * Caps at `limit` (default 3) to bound crawl cost.
 */
export function extractHttpUrls(text: string, limit = 3): string[] {
  if (!text?.trim()) return [];
  const found = text.match(URL_RE) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of found) {
    const cleaned = cleanUrl(raw);
    try {
      const u = new URL(cleaned);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      const key = u.href.replace(/\/$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(u.href);
      if (out.length >= limit) break;
    } catch {
      /* skip invalid */
    }
  }
  return out;
}
