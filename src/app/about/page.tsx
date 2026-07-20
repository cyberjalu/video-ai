import Link from "next/link";
import { WebShell } from "@/components/WebShell";

export default function AboutPage() {
  return (
    <WebShell
      header={
        <div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Home
          </Link>
          <h1 className="mt-2 text-xl font-semibold">About ClipNews</h1>
        </div>
      }
    >
      <article className="surface-panel max-w-2xl space-y-4 rounded-2xl p-6 text-sm leading-relaxed text-zinc-300">
        <p>
          ClipNews is a free web app that turns articles or prompts into short-form videos. You bring your own
          Google Gemini and optional Pexels API keys — they stay in your browser session and are never stored on
          our servers.
        </p>
        <p>
          Generated jobs and MP4 files are kept on the server for up to 72 hours (configurable via{" "}
          <code className="text-cyan-200">JOB_TTL_HOURS</code>), then deleted automatically.
        </p>
        <p>
          Stock footage may be sourced from{" "}
          <a href="https://www.pexels.com" className="text-cyan-300 underline">
            Pexels
          </a>
          . Please follow Pexels license terms when publishing.
        </p>
        <p>
          Configure keys in <Link href="/settings" className="text-cyan-300 underline">Settings</Link>.
        </p>
      </article>
    </WebShell>
  );
}
