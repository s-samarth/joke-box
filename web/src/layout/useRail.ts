/**
 * The side rail is full (icons and names) or compact (icons only). Compact below 1280px, which is an
 * iPad in landscape or a small laptop, so lists and jokes get the room; full when wider. Its toggle
 * overrides that on this device, and toggling back to what the width would pick goes back to automatic.
 */
import { useEffect, useState } from 'react'
import { withTransition } from '../lib/viewTransition'

const KEY = 'jokebox.rail'
type Choice = 'full' | 'compact' | null

/** Whether a media query matches, kept up to date as the window changes. */
export function useMedia(query: string): boolean {
  const supported = typeof window.matchMedia === 'function'
  const [matches, setMatches] = useState(() => supported && window.matchMedia(query).matches)
  useEffect(() => {
    if (!supported) return
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query, supported])
  return matches
}

function saved(): Choice {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'full' || value === 'compact' ? value : null
  } catch {
    return null
  }
}

export function useRail(): { compact: boolean; toggle: () => void } {
  const wide = useMedia('(min-width: 1280px)')
  const [choice, setChoice] = useState<Choice>(saved)
  const compact = choice ? choice === 'compact' : !wide
  const toggle = () => {
    const next = !compact
    const value: Choice = next === !wide ? null : next ? 'compact' : 'full'
    withTransition(() => setChoice(value))
    try {
      if (value) localStorage.setItem(KEY, value)
      else localStorage.removeItem(KEY)
    } catch {
      // Private mode: it lasts until the page reloads.
    }
  }
  return { compact, toggle }
}
