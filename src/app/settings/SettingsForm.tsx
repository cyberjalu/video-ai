"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { WebShell } from "@/components/WebShell";
import { loadSessionGeminiKey, loadSessionPexelsKey, saveSessionKeys, isRememberKeysEnabled } from "@/lib/session-keys";

export default function SettingsForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("return") ?? "/";
  const [gemini, setGemini] = useState(() => loadSessionGeminiKey());
  const [pexels, setPexels] = useState(() => loadSessionPexelsKey());
  const [remember, setRemember] = useState(() => isRememberKeysEnabled());
  const [saved, setSaved] = useState(false);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    saveSessionKeys(gemini, pexels, remember);
    setSaved(true);
  }

  return (
    <WebShell
      header={
        <div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Home
          </Link>
          <h1 className="mt-2 text-xl font-semibold">API keys (BYOK)</h1>
          <p className="mt-1 text-sm text-zinc-400">Keys stay in your browser session only.</p>
        </div>
      }
    >
      <form onSubmit={onSave} className="surface-panel max-w-lg space-y-4 rounded-2xl p-6">
        <label className="block text-sm">
          <span className="text-zinc-400">Gemini API key</span>
          <input
            type="password"
            value={gemini}
            onChange={(e) => setGemini(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">Pexels API key (optional)</span>
          <input
            type="password"
            value={pexels}
            onChange={(e) => setPexels(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember keys in this browser (localStorage)
        </label>
        <button
          type="submit"
          className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100"
        >
          Save to session
        </button>
        {saved ? (
          <Link href={returnTo} className="ml-3 text-sm text-cyan-300">
            Continue →
          </Link>
        ) : null}
      </form>
    </WebShell>
  );
}
