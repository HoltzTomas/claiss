import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface TransparentBadgeProps {
  children: ReactNode
  className?: string
  variant?: "default" | "primary" | "secondary"
}

export function TransparentBadge({ children, className, variant = "default" }: TransparentBadgeProps) {
  const variantClasses = {
    default: "bg-card text-card-foreground border-border",
    primary: "bg-primary/30 text-primary-foreground border-primary/40",
    secondary: "bg-secondary/30 text-secondary-foreground border-secondary/40",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
        "backdrop-blur-sm border transition-all duration-300 hover:glow-subtle hover:scale-105",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
