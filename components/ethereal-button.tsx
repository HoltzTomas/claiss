import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes, ReactNode } from "react"

interface EtherealButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "outline"
  size?: "sm" | "md" | "lg"
}

export function EtherealButton({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: EtherealButtonProps) {
  const baseClasses =
    "rounded-xl font-medium transition-all duration-300 glassmorphism flex items-center justify-center"

  const variantClasses = {
    primary: "bg-primary/80 text-primary-foreground hover:glow-accent hover:scale-105 hover:bg-primary/90",
    secondary: "bg-secondary/80 text-secondary-foreground hover:glow-subtle hover:scale-105 hover:bg-secondary/90",
    ghost: "bg-transparent text-foreground hover:frosted-medium hover:glow-subtle hover:scale-105",
    outline:
      "bg-transparent text-foreground border-2 border-primary/50 hover:frosted-light hover:glow-subtle hover:border-primary/80",
  }

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  }

  return (
    <button className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)} {...props}>
      {children}
    </button>
  )
}
