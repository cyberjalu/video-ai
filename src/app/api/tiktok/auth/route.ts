import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { buildTikTokAuthUrl, tiktokConfigured } from "@/server/tiktok/client";

export async function GET() {
  if (!tiktokConfigured()) {
    return NextResponse.json(
      {
        error:
          "TikTok is not configured. Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, and TIKTOK_REDIRECT_URI.",
      },
      { status: 503 },
    );
  }
  const state = randomBytes(16).toString("hex");
  const url = buildTikTokAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("tiktok_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
