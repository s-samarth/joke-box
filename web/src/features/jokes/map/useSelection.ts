/**
 * The joke open in the panel on the map or the board. Picking one also scrolls its box into view
 * (once it has rendered), and Escape closes the panel.
 */
import { useEffect, useState } from 'react'

export function useSelection() {
  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => {
    if (!selected) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [selected])
  const pick = (id: string) => {
    setSelected(id)
    setTimeout(() => document.querySelector(`[data-joke="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }))
  }
  return { selected, pick, close: () => setSelected(null) }
}
