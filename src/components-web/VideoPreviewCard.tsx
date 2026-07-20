"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Download, RotateCcw, Video, Volume2, VolumeX, Play, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "./Card";
import { SecondaryButton } from "./Buttons";

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/30 px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="mt-1 text-sm font-bold text-zinc-200">{value}</div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <Card className="flex min-h-[400px] h-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="relative mb-5">
        <div className="h-[160px] w-[80px] rounded-[20px] border-2 border-white/10 bg-black/40">
          <div className="mx-auto mt-3 h-3 w-16 rounded-full bg-white/8" />
          <div className="mx-4 mt-4 h-20 rounded-xl bg-white/5" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5">
            <Video className="h-4 w-4 text-zinc-500" />
          </div>
        </div>
      </div>
      <div className="text-sm font-semibold text-zinc-400">Video preview will appear here</div>
    </Card>
  );
}

export function VideoPreviewCard({
  title,
  source,
  durationSec,
  sceneCount,
  mp4Url,
  captionText,
  onCreateAnother,
  onCopyCaption,
  onRerender,
}: {
  title?: string;
  source?: string;
  durationSec?: number;
  sceneCount?: number;
  mp4Url?: string | null;
  captionText?: string | null;
  onCreateAnother: () => void;
  onCopyCaption: () => void;
  onRerender?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mp4Url) return;
    setLoadError(null);
    setReady(false);
    setIsPlaying(false);
    const el = videoRef.current;
    if (!el) return;
    el.load();
    const tryPlay = () => {
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    };
    el.addEventListener("loadeddata", tryPlay, { once: true });
    return () => el.removeEventListener("loadeddata", tryPlay);
  }, [mp4Url]);

  if (!mp4Url) return <EmptyPreview />;

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()?.catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="overflow-hidden p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-zinc-100">Preview</div>
          <SecondaryButton onClick={onCreateAnother} className="h-7 gap-1.5 rounded-lg px-2.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            New
          </SecondaryButton>
        </div>

        <div className="mt-5 flex justify-center">
          <div className="relative w-[220px]">
            <div
              className="group relative aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-[36px] border-[8px] border-zinc-900 bg-zinc-950"
              onClick={togglePlay}
            >
              <video
                key={mp4Url}
                ref={videoRef}
                src={mp4Url}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                preload="auto"
                className="h-full w-full object-cover"
                onLoadedData={() => {
                  setReady(true);
                  setLoadError(null);
                }}
                onError={() => setLoadError("Could not load video preview.")}
              />
              {loadError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-4 text-center">
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                  <div className="text-[11px] text-zinc-300">{loadError}</div>
                </div>
              ) : null}
              {!ready && !loadError ? (
                <div className="absolute inset-0 grid place-items-center bg-zinc-950/80">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
                </div>
              ) : null}
              {!isPlaying && ready && !loadError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="h-8 w-8 text-white" fill="currentColor" />
                </div>
              ) : null}
              <button
                type="button"
                onClick={toggleMute}
                className="absolute bottom-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {title || source ? (
          <div className="mt-5">
            {title ? <div className="text-sm font-semibold text-zinc-100">{title}</div> : null}
            {source ? <div className="mt-1 text-xs text-zinc-500">{source}</div> : null}
          </div>
        ) : null}

        {durationSec || sceneCount ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {durationSec ? <MetaStat label="Duration" value={`${durationSec}s`} /> : null}
            {sceneCount ? <MetaStat label="Scenes" value={String(sceneCount)} /> : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          <a
            href={mp4Url}
            download
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3.5 text-sm font-bold text-zinc-900"
          >
            <Download className="h-4 w-4" />
            Download MP4
          </a>
          <SecondaryButton onClick={onCopyCaption} disabled={!captionText} className="w-full justify-center text-xs">
            <Copy className="h-3.5 w-3.5" />
            Copy Caption
          </SecondaryButton>
          {onRerender ? (
            <SecondaryButton onClick={onRerender} className="w-full justify-center text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Re-render
            </SecondaryButton>
          ) : null}
        </div>
      </Card>
    </motion.div>
  );
}
