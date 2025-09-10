import { cn } from "@/lib/utils"
import type { InputHTMLAttributes } from "react"

interface GlowingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "search"
}

export function GlowingInput({ className, variant = "default", ...props }: GlowingInputProps) {
  return (
    <div className=" w-full flex">
      <input
        className={cn(
          "w-full px-4 py-3 rounded-xl bg-input text-foreground",
          "glassmorphism border-0 outline-none",
          "focus:glow-accent focus:frosted-medium transition-all duration-300",
          "placeholder:text-muted-foreground",
          className,
        )}
        {...props}
      />
      {variant === "search" && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-5 h-5 border-2 border-muted-foreground rounded-full opacity-60" />
        </div>
      )}
    </div>
  )
}
