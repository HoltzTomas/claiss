"use client";

import { Copy, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ExampleVideo {
  title: string;
  author?: string;
  prompt: string;
  videoUrl: string;
  duration: string;
  category: string;
}

interface ExampleModalProps {
  video: ExampleVideo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExampleModal({
  video,
  isOpen,
  onClose,
}: ExampleModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !video) {
    return null;
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(video.prompt);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="classia-shell relative z-10 grid max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] lg:grid-cols-[1.35fr_0.95fr]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 transition hover:bg-white/[0.12] hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-white/[0.08] bg-[#080c18] p-5 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-black/30 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
            <video
              src={video.videoUrl}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full bg-black object-cover"
            />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm text-white/[0.42]">
            <span>{video.author ?? "Classia community"}</span>
            <span>{video.duration}</span>
          </div>
        </div>

        <div className="max-h-[92vh] overflow-y-auto p-6 sm:p-8">
          <div className="inline-flex items-center rounded-full border border-[#2b67a6]/60 bg-[#10203a]/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#58a6ff]">
            {video.category}
          </div>

          <h2 className="mt-5 text-3xl font-black tracking-[-0.05em] text-white sm:text-[2.6rem]">
            {video.title}
          </h2>

          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/[0.35]">
              Original Prompt
            </p>
            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-5 text-base leading-8 text-white/[0.72]">
              {video.prompt}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyPrompt}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition ${
                isCopied
                  ? "border-[#00d4aa]/40 bg-[#00d4aa]/14 text-[#7bf5de]"
                  : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <Copy className="h-4 w-4" />
              {isCopied ? "Copied!" : "Copy Prompt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
