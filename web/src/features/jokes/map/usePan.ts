/**
 * Move around a map or board by dragging it with a mouse. A drag that ends on a box doesn't count
 * as a tap on it. On a touch screen the finger already scrolls, so that's left to the browser.
 */
import { useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react'

export function usePan(ref: RefObject<HTMLDivElement | null>) {
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null)
  return {
    onPointerDown: (e: PointerEvent) => {
      const el = ref.current
      if (!el || e.pointerType !== 'mouse' || e.button !== 0) return
      drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false }
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current
      const el = ref.current
      if (!d || !el) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return
      if (!d.moved) el.setPointerCapture(e.pointerId)
      d.moved = true
      el.scrollLeft = d.left - dx
      el.scrollTop = d.top - dy
    },
    // The click after a drag comes straight after this, so the flag is cleared just after it.
    onPointerUp: () => setTimeout(() => { drag.current = null }),
    onClickCapture: (e: MouseEvent) => {
      if (!drag.current?.moved) return
      e.preventDefault()
      e.stopPropagation()
    },
  }
}
