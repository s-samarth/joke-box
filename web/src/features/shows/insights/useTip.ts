/**
 * Hover and focus readouts for charts. A chart wraps itself in a relative box (`box`), spreads
 * `on(...)` onto each mark, and renders <TipBox tip={tip} />. Keyboard focus shows the same
 * readout as hover, so every mark can be read without a mouse.
 */
import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react'

export interface Tip {
  x: number
  y: number
  title: string
  lines: string[]
}

export function useTip() {
  const box = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const show = (el: Element, title: string, lines: string[]) => {
    const outer = box.current?.getBoundingClientRect()
    if (!outer) return
    const r = el.getBoundingClientRect()
    // Keep the readout inside the chart: clamp its centre away from the edges.
    const x = Math.min(Math.max(r.left + r.width / 2 - outer.left, 90), Math.max(outer.width - 90, 90))
    setTip({ x, y: r.top - outer.top, title, lines })
  }
  const hide = () => setTip(null)
  const on = (title: string, lines: string[]) => ({
    tabIndex: 0,
    onPointerEnter: (e: PointerEvent<Element>) => show(e.currentTarget, title, lines),
    onPointerLeave: hide,
    onFocus: (e: FocusEvent<Element>) => show(e.currentTarget, title, lines),
    onBlur: hide,
  })
  return { box, tip, show, hide, on }
}

/** Width of an element, kept up to date as the window resizes, so SVG charts can lay out in pixels. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}
