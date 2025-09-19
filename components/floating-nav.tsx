"use client"

import { useState } from "react"
import { GlassCard } from "./glass-card"
import { EtherealButton } from "./ethereal-button"
import { Sparkles } from "lucide-react"

export function FloatingNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
      <GlassCard className="px-12 py-4">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-foreground font-semibold">Claiss</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="/" className="text-foreground hover:text-primary transition-colors">
              Design System
            </a>
          </div>

          <EtherealButton variant="ghost" size="sm">
            Try Free
          </EtherealButton>
        </div>
      </GlassCard>
    </nav>
  )
}
