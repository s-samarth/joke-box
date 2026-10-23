/**
 * Picking up a box on the joke board and putting it down somewhere else.
 *
 * With a mouse, a box lifts once you've dragged it a few pixels; a press that doesn't move is a
 * tap. On a touch screen a quick swipe should still scroll the board, so a box lifts only after
 * you hold it for a moment; from then until you let go, the board stops scrolling (a touchmove
 * listener that isn't passive, so it's allowed to cancel the scroll).
 *
 * Pattern: the live drag is kept in a ref (read by the event handlers, which must see the latest
 * values) and mirrored into state (which re-renders the box where your finger is).
 */
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'

interface Live {
  id: string
  x0: number
  y0: number
  dx: number
  dy: number
  lifted: boolean
  timer?: number
}

const HOLD_MS = 350

export function useBoxDrag(zoom: number, scroller: RefObject<HTMLDivElement | null>, onDrop: (id: string, dx: number, dy: number) => void) {
  const live = useRef<Live | null>(null)
  const dragged = useRef(false)
  const [moving, setMoving] = useState<{ id: string; dx: number; dy: number } | null>(null)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const hold = (e: TouchEvent) => live.current?.lifted && e.preventDefault()
    el.addEventListener('touchmove', hold, { passive: false })
    return () => el.removeEventListener('touchmove', hold)
  }, [scroller])

  const lift = (d: Live) => {
    d.lifted = true
    setMoving({ id: d.id, dx: 0, dy: 0 })
  }
  const end = (drop: boolean) => {
    const d = live.current
    live.current = null
    setMoving(null)
    if (!d) return
    clearTimeout(d.timer)
    if (!d.lifted) return
    // The click that follows a drag shouldn't open the joke.
    dragged.current = true
    setTimeout(() => { dragged.current = false })
    if (drop && (d.dx || d.dy)) onDrop(d.id, d.dx / zoom, d.dy / zoom)
  }

  /** The handlers for one box. */
  const handlers = (id: string) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      e.stopPropagation() // a box drag, not a board pan
      // Every move until you let go comes to this box, however fast the pointer travels.
      e.currentTarget.setPointerCapture(e.pointerId)
      const d: Live = { id, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, lifted: false }
      live.current = d
      if (e.pointerType !== 'mouse') d.timer = window.setTimeout(() => live.current === d && lift(d), HOLD_MS)
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const d = live.current
      if (!d || d.id !== id) return
      const dx = e.clientX - d.x0
      const dy = e.clientY - d.y0
      if (!d.lifted) {
        const far = Math.hypot(dx, dy)
        if (e.pointerType === 'mouse' && far > 4) lift(d)
        else if (far > 8) end(false) // a swipe: let the board scroll
        if (!d.lifted) return
      }
      d.dx = dx
      d.dy = dy
      setMoving({ id, dx: dx / zoom, dy: dy / zoom })
    },
    onPointerUp: () => end(true),
    onPointerCancel: () => end(false),
  })

  return { moving, handlers, justDragged: () => dragged.current }
}
