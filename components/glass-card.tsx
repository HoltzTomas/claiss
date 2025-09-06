import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
  variant?: "default" | "strong" | "subtle"
}

export function GlassCard({ children, className, variant = "default" }: GlassCardProps) {
  const variantClasses = {
    default: "glassmorphism",
    strong: "glassmorphism-strong",
    subtle: "frosted-light border-border/30",
  }

  return (
    <div
      className={cn(
        "rounded-xl transition-all duration-300",
        "hover:glow-subtle hover:scale-[1.02] hover:border-border/30",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </div>
  )
}
