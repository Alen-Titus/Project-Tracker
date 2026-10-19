"use client"

import * as React from "react"
import { Moon, Sun, Palette, Monitor, Check } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Toggle theme">
        <span className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    )
  }

  const themes = [
    { id: "light", label: "Light", icon: Sun, color: "bg-slate-200" },
    { id: "dark", label: "Dark", icon: Moon, color: "bg-slate-900 border border-slate-700" },
    { id: "violet", label: "Violet Dark", icon: Palette, color: "bg-violet-600" },
    { id: "rose", label: "Rose Dark", icon: Palette, color: "bg-rose-500" },
    { id: "system", label: "System", icon: Monitor, color: "bg-slate-500/50" },
  ]

  const handleSelect = (themeId: string) => {
    setTheme(themeId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        aria-label="Toggle theme"
      >
        <Palette className="h-4 w-4 text-muted-foreground hover:text-foreground transition-all hover:scale-110" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1.5 shadow-xl border-border bg-popover">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Appearance
        </div>
        <div className="space-y-0.5">
          {themes.map((t) => {
            const Icon = t.icon
            const isActive = theme === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer text-left ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${t.color}`} />
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span>{t.label}</span>
                </div>
                {isActive && <Check className="h-3.5 w-3.5 ml-auto" />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
