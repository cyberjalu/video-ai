import { NextResponse } from "next/server";
import { exchangeTikTokCode, tiktokConfigured } from "@/server/tiktok/client";

export async function GET(req: Request) {
  if (!tiktokConfigured()) {
    return NextResponse.redirect(new URL("/tiktok?error=not_configured", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)tiktok_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/tiktok?error=oauth_state", req.url));
  }

  try {
    const tokens = await exchangeTikTokCode(code);
    // Pass tokens to client via fragment-less query for sessionStorage handoff page
    const redirect = new URL("/tiktok", req.url);
    redirect.searchParams.set("connected", "1");
    redirect.searchParams.set("access_token", tokens.access_token);
    redirect.searchParams.set("refresh_token", tokens.refresh_token);
    redirect.searchParams.set("open_id", tokens.open_id);
    redirect.searchParams.set("expires_in", String(tokens.expires_in));
    const res = NextResponse.redirect(redirect);
    res.cookies.set("tiktok_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : String(e));
    return NextResponse.redirect(new URL(`/tiktok?error=${msg}`, req.url));
  }
}
