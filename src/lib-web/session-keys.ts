const GEMINI_KEY = "clipnews.gemini";
const PEXELS_KEY = "clipnews.pexels";
const REMEMBER_KEY = "clipnews.rememberKeys";
const RECENT_JOBS_KEY = "clipnews.recentJobIds";

function useRemembered() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(REMEMBER_KEY) === "1";
}

export function loadSessionGeminiKey(): string {
  if (typeof window === "undefined") return "";
  const fromSession = sessionStorage.getItem(GEMINI_KEY);
  if (fromSession) return fromSession;
  if (useRemembered()) return localStorage.getItem(GEMINI_KEY) ?? "";
  return "";
}

export function loadSessionPexelsKey(): string {
  if (typeof window === "undefined") return "";
  const fromSession = sessionStorage.getItem(PEXELS_KEY);
  if (fromSession) return fromSession;
  if (useRemembered()) return localStorage.getItem(PEXELS_KEY) ?? "";
  return "";
}

export function isRememberKeysEnabled(): boolean {
  return useRemembered();
}

export function saveSessionKeys(gemini: string, pexels?: string, remember?: boolean) {
  const g = gemini.trim();
  const p = (pexels ?? "").trim();
  sessionStorage.setItem(GEMINI_KEY, g);
  sessionStorage.setItem(PEXELS_KEY, p);
  const rememberOn = remember ?? useRemembered();
  localStorage.setItem(REMEMBER_KEY, rememberOn ? "1" : "0");
  if (rememberOn) {
    localStorage.setItem(GEMINI_KEY, g);
    localStorage.setItem(PEXELS_KEY, p);
  } else {
    localStorage.removeItem(GEMINI_KEY);
    localStorage.removeItem(PEXELS_KEY);
  }
}

export function pushRecentJobId(jobId: string) {
  if (typeof window === "undefined") return;
  const prev = loadRecentJobIds().filter((id) => id !== jobId);
  const next = [jobId, ...prev].slice(0, 20);
  sessionStorage.setItem(RECENT_JOBS_KEY, JSON.stringify(next));
}

export function loadRecentJobIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(RECENT_JOBS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
