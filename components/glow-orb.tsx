import { cn } from "@/lib/utils"

interface GlowOrbProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
}

export function GlowOrb({ className, size = "lg" }: GlowOrbProps) {
  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-32 h-32",
    lg: "w-48 h-48",
    xl: "w-64 h-64",
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "rounded-full glassmorphism-ultra",
          "bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30",
          "glow-subtle animate-pulse",
          sizeClasses[size],
        )}
      />
      <div
        className={cn(
          "absolute inset-4 rounded-full frosted-medium blur-sm",
          "bg-gradient-to-br from-primary/20 to-accent/20",
          "animate-pulse",
        )}
      />
      <div
        className={cn(
          "absolute inset-8 rounded-full frosted-light blur-md bg-gradient-to-br from-primary/10 to-secondary/10",
        )}
      />
    </div>
  )
}
