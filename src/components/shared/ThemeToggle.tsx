'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHasMounted } from '@/hooks/useHasMounted'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const hasMounted = useHasMounted()

  if (!hasMounted) return null // Prevent hydration mismatch

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
