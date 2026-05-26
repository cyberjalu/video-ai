import { useState, useRef } from "react";
import { Copy, Download, FolderOpen, RotateCcw, Video, Volume2, VolumeX, Play } from "lucide-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { motion } from "framer-motion";
import { Card } from "./Card";
import { SecondaryButton } from "./Buttons";
import { toAssetSrc } from "../lib/tauri";

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
    <Card className="flex flex-col items-center justify-center px-6 py-12 text-center h-full min-h-[400px]">
      {/* Phone outline illustration */}
      <div className="relative mb-5">
        <div className="h-[160px] w-[80px] rounded-[20px] border-2 border-white/10 bg-black/40">
          <div className="mx-auto mt-3 h-3 w-16 rounded-full bg-white/8" />
          <div className="mx-4 mt-4 h-20 rounded-xl bg-white/5" />
        </div>
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5">
            <Video className="h-4 w-4 text-zinc-500" />
          </div>
        </div>
      </div>

      <div className="text-sm font-semibold text-zinc-400">Video preview will appear here</div>
      <div className="mt-2 max-w-[200px] text-xs leading-relaxed text-zinc-600">
        Create your first vertical TikTok video to preview it.
      </div>
    </Card>
  );
}

export function VideoPreviewCard({
  title,
  source,
  durationSec,
  sceneCount,
  mp4Path,
  outputDir,
  captionText,
  onCreateAnother,
  onCopyCaption,
}: {
  title?: string;
  source?: string;
  durationSec?: number;
  sceneCount?: number;
  mp4Path?: string | null;
  outputDir?: string | null;
  captionText?: string | null;
  onCreateAnother: () => void;
  onCopyCaption: () => void;
}) {
  if (!mp4Path) {
    return <EmptyPreview />;
  }

  const src = toAssetSrc(mp4Path);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card className="overflow-hidden p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-zinc-100">Preview</div>
          <div className="flex items-center gap-1.5">
            <SecondaryButton
              onClick={onCreateAnother}
              className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
              title="Create another video"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New</span>
            </SecondaryButton>
            {outputDir ? (
              <SecondaryButton
                onClick={() => revealItemInDir(outputDir)}
                className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
                title="Open output folder"
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </SecondaryButton>
            ) : null}
          </div>
        </div>

        {/* Phone mockup */}
        <div className="mt-5 flex justify-center">
          <div className="relative">
            {/* Ambient glow */}
            <div className="absolute -inset-6 rounded-[48px] bg-gradient-to-b from-violet-500/15 via-cyan-500/10 to-transparent blur-2xl" />

            {/* Phone shell */}
            <div className="relative w-[220px]">
              <div className="overflow-hidden rounded-[36px] border-[8px] border-zinc-900 bg-zinc-950 shadow-[0_40px_120px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] ring-1 ring-white/10">
                {/* Dynamic Island / Notch */}
                <div className="absolute left-1/2 top-2 z-20 h-[18px] w-[60px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_-1px_1px_rgba(255,255,255,0.1)]" />
                
                {/* Video Container */}
                <div 
                  className="group relative aspect-[9/16] w-full cursor-pointer bg-zinc-900"
                  onClick={togglePlay}
                >
                  <video
                    key={src}
                    ref={videoRef}
                    src={src}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="h-full w-full object-cover"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {/* Play/Pause Overlay Indicator (shows briefly or when paused) */}
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md">
                        <Play className="h-6 w-6 ml-1" fill="currentColor" />
                      </div>
                    </div>
                  )}

                  {/* Audio Toggle Button */}
                  <button
                    onClick={toggleMute}
                    className="absolute bottom-4 right-4 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white shadow-sm backdrop-blur-md transition hover:bg-black/60 hover:scale-105 active:scale-95"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Side button highlights (Hardware buttons) */}
              <div className="absolute right-[-10px] top-20 h-10 w-[3px] rounded-r-full bg-zinc-700 shadow-[inset_1px_0_1px_rgba(255,255,255,0.2)]" />
              <div className="absolute left-[-10px] top-16 h-8 w-[3px] rounded-l-full bg-zinc-700 shadow-[inset_-1px_0_1px_rgba(255,255,255,0.2)]" />
              <div className="absolute left-[-10px] top-28 h-8 w-[3px] rounded-l-full bg-zinc-700 shadow-[inset_-1px_0_1px_rgba(255,255,255,0.2)]" />
            </div>
          </div>
        </div>

        {/* Metadata */}
        {(title || source) && (
          <div className="mt-5">
            {title && (
              <div className="text-sm font-semibold leading-snug text-zinc-100 line-clamp-2">{title}</div>
            )}
            {source && (
              <div className="mt-1 text-xs text-zinc-500">{source}</div>
            )}
          </div>
        )}

        {/* Stats row */}
        {(durationSec || sceneCount) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {durationSec ? (
              <MetaStat label="Duration" value={`${durationSec}s`} />
            ) : null}
            {sceneCount ? (
              <MetaStat label="Scenes" value={String(sceneCount)} />
            ) : null}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <a
            href={src}
            download
            className="group relative inline-flex w-full overflow-hidden items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3.5 text-sm font-bold text-zinc-900 shadow-[0_0_40px_rgba(255,255,255,0.15)] transition hover:scale-[1.02] hover:bg-white active:scale-[0.98]"
          >
            {/* Shimmer sweep effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
            <Download className="h-4 w-4 relative z-10" />
            <span className="relative z-10">Download MP4</span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            {outputDir ? (
              <SecondaryButton onClick={() => revealItemInDir(outputDir)} className="w-full justify-center text-xs">
                <FolderOpen className="h-3.5 w-3.5" />
                Output Folder
              </SecondaryButton>
            ) : null}
            <SecondaryButton
              onClick={onCopyCaption}
              disabled={!captionText}
              className="w-full justify-center text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Caption
            </SecondaryButton>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
