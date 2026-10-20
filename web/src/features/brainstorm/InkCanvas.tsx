/**
 * A handwriting page. Apple Pencil, a mouse or a finger all draw, until the page sees a pencil:
 * from then on fingers (and a resting palm) scroll instead of drawing, as in Notes.
 *
 * Pattern: Pointer Events. One set of handlers (pointerdown/move/up) covers mouse, touch and
 * pen, and `e.pointerType` says which it is; `e.pressure` gives Pencil pressure. The canvas has
 * `touch-action: none`, so the browser never scrolls on its own and we decide per pointer.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Stroke } from '../../api/types'
import { drawSegment, drawStroke, eraseAt, LINE_GAP, PAGE_WIDTH, pageHeight } from './ink'

export type InkTool = 'pen' | 'eraser'

interface Props {
  strokes: Stroke[]
  onChange: (strokes: Stroke[]) => void
  tool: InkTool
  color: string
  size: number
}

export function InkCanvas({ strokes, onChange, tool, color, size }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  const live = useRef<Stroke | null>(null)
  const penSeen = useRef(false)
  const scrollFrom = useRef<number | null>(null)
  const drawing = useRef(false)
  // The newest strokes, so back-to-back strokes never build on a stale list.
  const current = useRef(strokes)
  useLayoutEffect(() => { current.current = strokes }, [strokes])
  const commit = (next: Stroke[]) => { current.current = next; onChange(next) }
  const scale = width / PAGE_WIDTH
  const height = Math.round(pageHeight(strokes) * scale)

  // Track the canvas's on-screen width so handwriting rescales with the window.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Redraw everything whenever the strokes or the size change. Drawn at the screen's pixel
  // density (devicePixelRatio) so lines stay crisp on a Retina iPad.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !width) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    for (const s of strokes) drawStroke(ctx, s, scale)
  }, [strokes, width, height, scale])

  const toPoint = (e: React.PointerEvent | PointerEvent): Stroke['points'][number] => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const pressure = e.pointerType === 'mouse' || !e.pressure ? 0.5 : e.pressure
    const round = (n: number) => Math.round(n * 10) / 10
    return [round((e.clientX - rect.left) / scale), round((e.clientY - rect.top) / scale), round(pressure * 100) / 100]
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') penSeen.current = true
    if (e.pointerType === 'touch' && penSeen.current) {
      scrollFrom.current = e.clientY
      return
    }
    drawing.current = true
    // Capture keeps the stroke going if the pen slides off the canvas edge.
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
    const point = toPoint(e)
    if (tool === 'eraser') {
      commit(eraseAt(current.current, point[0], point[1]))
      return
    }
    live.current = { color, size, points: [point] }
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) drawStroke(ctx, live.current, scale)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (scrollFrom.current !== null && e.pointerType === 'touch') {
      window.scrollBy(0, scrollFrom.current - e.clientY)
      scrollFrom.current = e.clientY
      return
    }
    if (!drawing.current) return
    if (tool === 'eraser') {
      const [x, y] = toPoint(e)
      const next = eraseAt(current.current, x, y)
      if (next !== current.current) commit(next)
      return
    }
    const stroke = live.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!stroke || !ctx) return
    // A pencil reports up to 240 points a second; the browser bundles the extras into
    // "coalesced" events, and using them all keeps fast handwriting smooth.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    for (const ev of events.length ? events : [e.nativeEvent]) {
      stroke.points.push(toPoint(ev))
      drawSegment(ctx, stroke, stroke.points.length - 1, scale)
    }
  }

  const finish = () => {
    scrollFrom.current = null
    drawing.current = false
    const stroke = live.current
    live.current = null
    if (stroke) commit([...current.current, stroke])
  }

  return (
    <canvas ref={canvasRef} aria-label="Handwriting page" style={{ height, touchAction: 'none', backgroundSize: `100% ${LINE_GAP * scale}px` }}
      className={`ruled-page block w-full rounded-xl ring-1 ring-rule ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finish} onPointerCancel={finish} />
  )
}
