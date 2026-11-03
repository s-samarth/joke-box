/**
 * One blank handwriting page, two screens wide: it opens on the left half and pans sideways
 * (a finger, the bar at the bottom of the screen, or a trackpad). The Pencil and a mouse always draw. A finger draws only when
 * "Draw with finger" is on (see fingerDraw.ts); otherwise one finger pans and two pinch to zoom,
 * as in OneNote. Two fingers always zoom, even mid-stroke: the half-drawn stroke is dropped.
 *
 * Pattern: Pointer Events. One set of handlers (pointerdown/move/up) covers mouse, touch and
 * pen, and `e.pointerType` says which it is; `e.pressure` gives Pencil pressure. The canvas has
 * `touch-action: none`, so the browser never scrolls or zooms on its own and we decide per pointer.
 *
 * Zoomed, the canvas is wider than the page area: the frame around it clips it and scrolls
 * sideways, while the window still scrolls up and down.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Stroke } from '../../api/types'
import { drawSegment, drawStroke, eraseAt, PAGE_SPAN, PAGE_WIDTH, pageHeight } from './ink'
import { PageNav } from './PageNav'
import { usePagePaint } from './usePagePaint'
import { useTouchView } from './useTouchView'

export type InkTool = 'pen' | 'eraser'

interface Props {
  /** Only this page's strokes; new strokes are tagged with `page`. */
  strokes: Stroke[]
  page: number
  onChange: (strokes: Stroke[]) => void
  tool: InkTool
  color: string
  size: number
  fingerDraws: boolean
  /** A Pencil touched the page. */
  onPencil: () => void
  zoom: number
  onZoom: (zoom: number) => void
}

export function InkCanvas({ strokes, page, onChange, tool, color, size, fingerDraws, onPencil, zoom, onZoom }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  const [scrollX, setScrollX] = useState(0)
  const live = useRef<Stroke | null>(null)
  /**
   * The pointer drawing right now, and where it is (a finger may yet turn into a pinch). The
   * canvas can't move mid-stroke, so its position is read once, not on every point.
   */
  const drawer = useRef<{ id: number; finger: boolean; x: number; y: number; rect: DOMRect } | null>(null)
  // The newest strokes, so back-to-back strokes never build on a stale list.
  const current = useRef(strokes)
  useLayoutEffect(() => { current.current = strokes }, [strokes])
  const commit = (next: Stroke[]) => { current.current = next; onChange(next) }
  const scale = (width * zoom) / PAGE_WIDTH
  const cssWidth = Math.round((width * zoom * PAGE_SPAN) / PAGE_WIDTH)
  const height = Math.round(pageHeight(strokes) * scale)
  const view = useTouchView({ frameRef, canvasRef, zoom, scale, onZoom })
  // How far across the page the view is (0 to 1), so turning the iPad keeps the same spot in view.
  const across = useRef(0)
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollX(e.currentTarget.scrollLeft)
    across.current = cssWidth ? e.currentTarget.scrollLeft / cssWidth : 0
  }
  useLayoutEffect(() => {
    if (frameRef.current) frameRef.current.scrollLeft = across.current * frameRef.current.scrollWidth
  }, [width])
  const panTo = (left: number) => { if (frameRef.current) frameRef.current.scrollLeft = left }

  // Track the page area's width so handwriting rescales with the window.
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // iPadOS reads a Pencil or finger resting still for half a second as a long-press, selects the
  // nearest text on the page and cancels the stroke. Cancelling the touch itself stops iOS
  // starting any gesture of its own (select, magnifier, callout); the pointer events that draw,
  // pan and zoom still arrive. React's touch handlers are passive and can't cancel, hence this.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const stop = (e: TouchEvent) => e.preventDefault()
    el.addEventListener('touchstart', stop, { passive: false })
    return () => el.removeEventListener('touchstart', stop)
  }, [])

  // Drawn at the screen's pixel density so lines stay crisp on a Retina iPad (see usePagePaint).
  const painter = usePagePaint({ canvasRef, strokes, live, cssWidth, height, scale })

  const toPoint = (e: React.PointerEvent | PointerEvent, rect = canvasRef.current!.getBoundingClientRect()): Stroke['points'][number] => {
    const pressure = e.pointerType === 'mouse' || !e.pressure ? 0.5 : e.pressure
    const round = (n: number) => Math.round(n * 10) / 10
    return [round((e.clientX - rect.left) / scale), round((e.clientY - rect.top) / scale), round(pressure * 100) / 100]
  }

  /** A second finger arrived mid-stroke: that was the start of a pinch, not a line. */
  const dropFingerStroke = () => {
    const d = drawer.current
    if (!d?.finger) return
    drawer.current = null
    live.current = null
    painter.redraw()
    view.fingerDown(d.id, d)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const finger = e.pointerType === 'touch'
    view.stopGlide()
    // Capture keeps the pointer ours if it slides off the canvas edge.
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
    if (e.pointerType === 'pen') {
      onPencil()
      view.penDown()
      if (drawer.current?.finger) {
        // A finger "drawing" when the Pencil lands was a resting palm: drop its line.
        drawer.current = null
        live.current = null
        painter.redraw()
      }
    }
    if (finger && (!fingerDraws || view.penActive() || view.fingersDown() > 0 || drawer.current)) {
      dropFingerStroke()
      view.fingerDown(e.pointerId, { x: e.clientX, y: e.clientY })
      return
    }
    if (drawer.current) return // already drawing with another pointer
    const rect = e.currentTarget.getBoundingClientRect()
    drawer.current = { id: e.pointerId, finger, x: e.clientX, y: e.clientY, rect }
    const point = toPoint(e, rect)
    if (tool === 'eraser') {
      commit(eraseAt(current.current, point[0], point[1]))
      return
    }
    live.current = { color, size, page, points: [point] }
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) drawStroke(ctx, live.current, scale)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (view.has(e.pointerId)) return view.fingerMove(e.pointerId, { x: e.clientX, y: e.clientY })
    const d = drawer.current
    if (d?.id !== e.pointerId) return
    d.x = e.clientX
    d.y = e.clientY
    if (tool === 'eraser') {
      const [x, y] = toPoint(e, d.rect)
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
      stroke.points.push(toPoint(ev, d.rect))
      drawSegment(ctx, stroke, stroke.points.length - 1, scale)
    }
  }

  const finish = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') view.penUp()
    view.fingerUp(e.pointerId)
    if (drawer.current?.id !== e.pointerId) return
    drawer.current = null
    const stroke = live.current
    live.current = null
    if (!stroke) return
    const next = [...current.current, stroke]
    painter.finished(stroke, next)
    commit(next)
  }

  // A trackpad's sideways swipe (or Shift + wheel) pans the page; the frame can't scroll itself.
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0)
    if (dx) e.currentTarget.scrollLeft += dx
  }

  return (
    <div>
      <div ref={frameRef} onScroll={onScroll} onWheel={onWheel} className="overflow-hidden rounded-xl bg-ink-2 ring-1 ring-rule [-webkit-touch-callout:none]">
        <canvas ref={canvasRef} aria-label={`Handwriting page ${page + 1}`} style={{ width: cssWidth, height, touchAction: 'none', transformOrigin: '0 0' }}
          className={`block ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finish} onPointerCancel={finish} />
      </div>
      <PageNav shown={width} total={cssWidth} at={scrollX} onPan={panTo} zoom={zoom} onFit={() => onZoom(1)} />
    </div>
  )
}
