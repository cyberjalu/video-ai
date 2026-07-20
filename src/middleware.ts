import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WINDOW_MS = 60 * 60 * 1000;
const DAY_MS = 24 * WINDOW_MS;
const MAX_CREATES = 5;
const MAX_BATCHES_PER_DAY = 2;

const jobBuckets = new Map<string, { count: number; resetAt: number }>();
const batchBuckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

function hit(
  map: Map<string, { count: number; resetAt: number }>,
  ip: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = map.get(ip);
  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

export function middleware(req: NextRequest) {
  if (req.method !== "POST") return NextResponse.next();

  const ip = clientIp(req);
  const path = req.nextUrl.pathname;

  if (path === "/api/jobs") {
    if (!hit(jobBuckets, ip, MAX_CREATES, WINDOW_MS)) {
      return NextResponse.json({ error: "Rate limit exceeded (5 jobs/hour)" }, { status: 429 });
    }
  }

  if (path === "/api/batches") {
    if (!hit(batchBuckets, ip, MAX_BATCHES_PER_DAY, DAY_MS)) {
      return NextResponse.json({ error: "Rate limit exceeded (2 batches/day)" }, { status: 429 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/jobs", "/api/batches"],
};
