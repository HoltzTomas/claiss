import { cn } from "@/lib/utils"

interface EtherealProgressProps {
  value: number
  className?: string
  variant?: "default" | "secondary" | "success"
}

export function EtherealProgress({ value, className, variant = "default" }: EtherealProgressProps) {
  const variantClasses = {
    default: "bg-primary/80 glow-accent",
    secondary: "bg-secondary/80 glow-subtle",
    success: "bg-accent/80 glow-subtle",
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>Progress</span>
        <span>{value}%</span>
      </div>
      <div className="w-full h-3 frosted-medium rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500 backdrop-blur-sm", variantClasses[variant])}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
