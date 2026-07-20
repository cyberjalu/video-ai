/**
 * TikTok Content Posting helpers (OAuth + publish).
 * Requires TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REDIRECT_URI.
 * User tokens stay client-side (sessionStorage) — BYOK-style.
 */

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const CREATOR_INFO = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";
const INIT_UPLOAD = "https://open.tiktokapis.com/v2/post/publish/video/init/";

export function tiktokConfigured(): boolean {
  return Boolean(
    process.env.TIKTOK_CLIENT_KEY?.trim() &&
      process.env.TIKTOK_CLIENT_SECRET?.trim() &&
      process.env.TIKTOK_REDIRECT_URI?.trim(),
  );
}

export function buildTikTokAuthUrl(state: string): string {
  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const redirect = process.env.TIKTOK_REDIRECT_URI!;
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: "user.info.basic,video.publish,video.upload",
    response_type: "code",
    redirect_uri: redirect,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeTikTokCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
}> {
  const body = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    code,
    grant_type: "authorization_code",
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    error?: string;
    error_description?: string;
  };
  if (!json.access_token) {
    throw new Error(json.error_description || json.error || "TikTok token exchange failed");
  }
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? "",
    expires_in: json.expires_in ?? 86400,
    open_id: json.open_id ?? "",
  };
}

export async function queryCreatorInfo(accessToken: string) {
  const res = await fetch(CREATOR_INFO, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({}),
  });
  return res.json();
}

export async function initVideoPublish(
  accessToken: string,
  opts: { title: string; videoSize: number; chunkSize: number; totalChunkCount: number },
): Promise<{ publish_id: string; upload_url: string }> {
  const res = await fetch(INIT_UPLOAD, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: opts.title.slice(0, 150),
        privacy_level: "SELF_ONLY",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: opts.videoSize,
        chunk_size: opts.chunkSize,
        total_chunk_count: opts.totalChunkCount,
      },
    }),
  });
  const json = (await res.json()) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { message?: string };
  };
  if (!json.data?.publish_id || !json.data?.upload_url) {
    throw new Error(json.error?.message || "TikTok publish init failed");
  }
  return { publish_id: json.data.publish_id, upload_url: json.data.upload_url };
}

export async function uploadVideoChunk(
  uploadUrl: string,
  buffer: Buffer,
  contentRange: string,
  totalSize: number,
) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(buffer.length),
      "Content-Range": contentRange,
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TikTok upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  void totalSize;
  return true;
}
