"use client"

import { useState } from "react"
import { GlassCard } from "./glass-card"
import { EtherealButton } from "./ethereal-button"
import { GlowingInput } from "./glowing-input"

export function GlassModal() {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <EtherealButton onClick={() => setIsOpen(true)}>Open Modal</EtherealButton>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

      <GlassCard variant="strong" className="relative w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-foreground mb-2">Ethereal Modal</h3>
          <p className="text-muted-foreground">A glassmorphic modal with glowing accents</p>
        </div>

        <div className="space-y-4">
          <GlowingInput placeholder="Enter your name..." />
          <GlowingInput placeholder="Enter your email..." type="email" />
        </div>

        <div className="flex gap-3">
          <EtherealButton variant="primary" className="flex-1">
            Submit
          </EtherealButton>
          <EtherealButton variant="ghost" className="flex-1" onClick={() => setIsOpen(false)}>
            Cancel
          </EtherealButton>
        </div>
      </GlassCard>
    </div>
  )
}
