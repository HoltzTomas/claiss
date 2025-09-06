"use client"

import { cn } from "@/lib/utils"

export function EtherealChart() {
  const data = [
    { label: "Jan", value: 65 },
    { label: "Feb", value: 78 },
    { label: "Mar", value: 52 },
    { label: "Apr", value: 89 },
    { label: "May", value: 95 },
    { label: "Jun", value: 73 },
  ]

  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between h-32 gap-2">
        {data.map((item, index) => (
          <div key={item.label} className="flex flex-col items-center gap-2 flex-1">
            <div className="w-full bg-input rounded-sm glassmorphism overflow-hidden">
              <div
                className={cn(
                  "w-full bg-gradient-to-t from-primary to-secondary rounded-sm glow-green",
                  "transition-all duration-1000 ease-out",
                )}
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  animationDelay: `${index * 100}ms`,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>{maxValue}</span>
      </div>
    </div>
  )
}
