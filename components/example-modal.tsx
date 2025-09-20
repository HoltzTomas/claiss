"use client"

import { useEffect, useState } from "react"
import { X, Copy } from "lucide-react"

interface ExampleVideo {
  title: string
  prompt: string
  videoUrl: string
  duration: string
  category: string
}

interface ExampleModalProps {
  video: ExampleVideo | null
  isOpen: boolean
  onClose: () => void
}

export function ExampleModal({ video, isOpen, onClose }: ExampleModalProps) {
  console.log("[v0] ExampleModal render - isOpen:", isOpen, "video:", video)

  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen || !video) {
    console.log("[v0] Modal not rendering - isOpen:", isOpen, "video:", video)
    return null
  }

  console.log("[v0] Modal rendering with video:", video.title)

  const copyPrompt = () => {
    navigator.clipboard.writeText(video.prompt)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[95vw] h-[95vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="flex h-full">
          <div className="flex-[2] flex items-center justify-center bg-black/20 p-8">
            <div className="relative w-full max-w-4xl aspect-video bg-black/40 rounded-xl overflow-hidden">
              <video
                src={video.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-cover"
                poster="/video-thumbnail.png"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">{video.duration}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">{video.title}</h2>
              <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                {video.category}
              </span>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-4">Original Prompt</h3>
              <div className="bg-black/20 border border-white/10 rounded-xl p-6 mb-6">
                <p className="text-gray-200 leading-relaxed text-lg">{video.prompt}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyPrompt}
                  className={`flex items-center gap-2 px-4 py-2 border border-white/20 rounded-lg transition-all duration-200 transform ${
                    isCopied
                      ? "bg-green-500/20 border-green-400/40 scale-95 text-green-300"
                      : "bg-white/10 hover:bg-white/20 hover:scale-105 text-white"
                  }`}
                >
                  <Copy className={`w-4 h-4 ${isCopied ? "text-green-300" : "text-white"}`} />
                  <span className="font-medium">{isCopied ? "Copied!" : "Copy Prompt"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
