import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export type TrendTopic = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url?: string;
  publishedAt?: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_PATH = path.join(process.cwd(), "data", "trends-cache.json");

const FEEDS: Array<{ name: string; url: string }> = [
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Reuters", url: "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best" },
];

/** Static fallback topics when RSS is unavailable */
const FALLBACK: TrendTopic[] = [
  {
    id: "fallback-ai-chips",
    title: "AI chip race heats up",
    summary: "New semiconductor bets reshape who wins the next AI wave.",
    source: "ClipNews",
  },
  {
    id: "fallback-climate",
    title: "Record heat wave hits cities",
    summary: "Extreme temperatures force new workplace and energy rules.",
    source: "ClipNews",
  },
  {
    id: "fallback-markets",
    title: "Markets react to surprise rate move",
    summary: "Traders scramble as central bank signals shift overnight.",
    source: "ClipNews",
  },
  {
    id: "fallback-space",
    title: "Private rocket launch sets new record",
    summary: "A commercial mission pushes payload and cadence limits.",
    source: "ClipNews",
  },
  {
    id: "fallback-health",
    title: "Breakthrough therapy clears early trial",
    summary: "Early results spark hope — and tough questions on access.",
    source: "ClipNews",
  },
];

type CacheFile = { fetchedAt: number; topics: TrendTopic[] };

function topicId(title: string, source: string) {
  return createHash("sha256").update(`${source}:${title}`).digest("hex").slice(0, 16);
}

function parseRssItems(xml: string, source: string): TrendTopic[] {
  const items: TrendTopic[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) && items.length < 12) {
    const block = m[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
    const link = block.match(/<link>(.*?)<\/link>/i);
    const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i);
    const pub = block.match(/<pubDate>(.*?)<\/pubDate>/i);
    const t = (title?.[1] || title?.[2] || "").replace(/<[^>]+>/g, "").trim();
    if (!t) continue;
    items.push({
      id: topicId(t, source),
      title: t.slice(0, 140),
      summary: (desc?.[1] || desc?.[2] || "")
        .replace(/<[^>]+>/g, "")
        .trim()
        .slice(0, 240),
      source,
      url: link?.[1]?.trim(),
      publishedAt: pub?.[1],
    });
  }
  return items;
}

async function readCache(): Promise<CacheFile | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    return JSON.parse(raw) as CacheFile;
  } catch {
    return null;
  }
}

async function writeCache(topics: TrendTopic[]) {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  const payload: CacheFile = { fetchedAt: Date.now(), topics };
  await fs.writeFile(CACHE_PATH, JSON.stringify(payload, null, 2));
}

export async function getTrends(force = false): Promise<TrendTopic[]> {
  const cached = await readCache();
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS && cached.topics.length) {
    return cached.topics;
  }

  const collected: TrendTopic[] = [];
  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "ClipNewsTrends/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      collected.push(...parseRssItems(xml, feed.name));
    } catch {
      /* feed failed */
    }
  }

  const topics = collected.length ? collected.slice(0, 24) : FALLBACK;
  await writeCache(topics);
  return topics;
}

export async function getTrendById(id: string): Promise<TrendTopic | null> {
  const topics = await getTrends();
  return topics.find((t) => t.id === id) ?? null;
}
