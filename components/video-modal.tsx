"use client"

import type React from "react"

import { X, User, Eye, Heart, Copy, ExternalLink } from "lucide-react"
import { GlassCard } from "./glass-card"
import { EtherealButton } from "./ethereal-button"
import { useState } from "react"

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  video: {
    title?: string
    author?: string
    views?: string
    likes?: string
    prompt?: string
    videoContent?: React.ReactNode
    description?: string
  }
}

export function VideoModal({ isOpen, onClose, video }: VideoModalProps) {
  const [copied, setCopied] = useState(false)

  console.log("[v0] VideoModal render - isOpen:", isOpen, "video:", video) // Added debug logging

  if (!isOpen) {
    // Simplified condition - only check isOpen
    return null
  }

  const handleCopyPrompt = async () => {
    if (video.prompt) {
      await navigator.clipboard.writeText(video.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed h-screen inset-0 z-50 flex items-center justify-center p-2 md:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Modal Content - Almost Full Screen */}
      <GlassCard className="relative w-full h-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
          {/* Video Section - Takes 2/3 of the space */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="flex-1 bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
              {video.videoContent}
              <div className="absolute inset-0 bg-black/10" />
            </div>

            {/* Video Info */}
            <div className="p-6 border-t border-white/10">
              <h2 className="text-3xl font-bold mb-4">{video.title || "Untitled Video"}</h2>
              <div className="flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span>{video.author || "Unknown Author"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <span>{video.views || "0"} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  <span>{video.likes || "0"} likes</span>
                </div>
              </div>
              {video.description && <p className="text-muted-foreground mt-4 text-lg">{video.description}</p>}
            </div>
          </div>

          {/* Prompt Section - Takes 1/3 of the space */}
          <div className="p-6 border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Original Prompt</h3>
              <div className="flex gap-2">
                <EtherealButton variant="ghost" size="sm" onClick={handleCopyPrompt}>
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? "Copied!" : "Copy"}
                </EtherealButton>
              </div>
            </div>

            <GlassCard className="p-6 mb-6 flex-1">
              <p className="text-base leading-relaxed">{video.prompt || "No prompt available"}</p>
            </GlassCard>

            {/* Additional Info */}
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 text-lg">What you'll learn:</h4>
                <ul className="text-muted-foreground space-y-2">
                  <li>• Step-by-step algorithm visualization</li>
                  <li>• Time and space complexity analysis</li>
                  <li>• Real-world applications</li>
                  <li>• Interactive code examples</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-white/10">
                <EtherealButton className="w-full" size="lg">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Create Similar Video
                </EtherealButton>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
