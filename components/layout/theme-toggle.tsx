"use client"

import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/contexts/theme-context"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  function handleCheckedChange(checked: boolean) {
    setTheme(checked ? "dark" : "light")
  }

  return (
    <Switch
      checked={isDark}
      onCheckedChange={handleCheckedChange}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    />
  )
}
