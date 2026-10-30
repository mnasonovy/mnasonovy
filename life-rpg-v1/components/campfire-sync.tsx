'use client'

import { useEffect } from 'react'

export function CampfireSync({ intensity }: { intensity: number }) {
  useEffect(() => {
    const value = Math.max(0, Math.min(1, intensity))
    document.documentElement.style.setProperty('--quest-flame', String(value))
    return () => {
      document.documentElement.style.removeProperty('--quest-flame')
    }
  }, [intensity])

  return null
}
