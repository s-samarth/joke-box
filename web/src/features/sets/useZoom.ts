/**
 * Zoom for the Bird's eye view: − and + buttons, Fit (the whole width on screen), and ctrl with the
 * scroll wheel, which is also what a trackpad pinch sends. The frame scrolls both ways at any zoom.
 * On a phone, a pinch zooms the page itself. Each device remembers its last zoom.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { clampZoom } from './birdsEye'

const KEY = 'jokebox.birdsEye.zoom'

function remembered(): number {
  try { return clampZoom(Number(localStorage.getItem(KEY)) || 1) } catch { return 1 }
}

export function useZoom() {
  const [zoom, setZoom] = useState(remembered)
  const [frame, setFrame] = useState<HTMLDivElement | null>(null)
  const content = useRef<HTMLDivElement>(null)
  const set = useCallback((z: number) => setZoom(clampZoom(z)), [])

  useEffect(() => { try { localStorage.setItem(KEY, String(zoom)) } catch { /* private window: not remembered */ } }, [zoom])
  useEffect(() => {
    if (!frame) return
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
    }
    frame.addEventListener('wheel', wheel, { passive: false })
    return () => frame.removeEventListener('wheel', wheel)
  }, [frame])

  /** The whole width on screen: the content's width at 100%, against the frame's. */
  const fit = () => {
    const c = content.current
    if (!frame || !c) return
    const natural = c.getBoundingClientRect().width / zoom
    if (natural > 0) set(frame.clientWidth / natural)
  }
  return { zoom, set, fit, frameRef: setFrame, contentRef: content }
}
