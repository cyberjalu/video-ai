import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "clipnews_job_token";

function secret(): string {
  return process.env.JOB_TOKEN_SECRET ?? "dev-insecure-job-token-secret-change-me";
}

export function mintJobToken(jobId: string): string {
  const nonce = randomBytes(8).toString("hex");
  const sig = createHmac("sha256", secret()).update(`${jobId}:${nonce}`).digest("hex");
  return `${nonce}.${sig}`;
}

export function verifyJobToken(jobId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const [nonce, sig] = token.split(".");
  if (!nonce || !sig) return false;
  const expected = createHmac("sha256", secret()).update(`${jobId}:${nonce}`).digest("hex");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function jobTokenCookie(jobId: string, token: string, expiresAt: string): string {
  const maxAge = Math.max(60, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  return `${COOKIE_NAME}_${jobId}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function readJobTokenFromRequest(req: Request, jobId: string): string | null {
  const header = req.headers.get("x-job-token");
  if (header) return header;
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}_${jobId}=([^;]+)`));
  return match?.[1] ?? null;
}

export function requireJobToken(req: Request, jobId: string): boolean {
  // Allow read-only result pages without token in Phase 1; mutations require token.
  return verifyJobToken(jobId, readJobTokenFromRequest(req, jobId));
}

export { COOKIE_NAME };
