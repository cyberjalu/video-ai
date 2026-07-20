import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_CREATES = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export function middleware(req: NextRequest) {
  if (req.method !== "POST" || req.nextUrl.pathname !== "/api/jobs") {
    return NextResponse.next();
  }

  const ip = clientIp(req);
  const now = Date.now();
  const entry = buckets.get(ip);
  if (!entry || now > entry.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }
  if (entry.count >= MAX_CREATES) {
    return NextResponse.json({ error: "Rate limit exceeded (5 jobs/hour)" }, { status: 429 });
  }
  entry.count += 1;
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/jobs"],
};
