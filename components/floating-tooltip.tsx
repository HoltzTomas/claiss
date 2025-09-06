"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface FloatingTooltipProps {
  children: ReactNode
  content: string
  className?: string
}

export function FloatingTooltip({ children, content, className }: FloatingTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          className={cn(
            "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2",
            "px-3 py-2 text-sm text-foreground bg-card glassmorphism rounded-lg",
            "glow-green animate-in fade-in-0 zoom-in-95 duration-200",
            "whitespace-nowrap",
            className,
          )}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-card" />
        </div>
      )}
    </div>
  )
}
