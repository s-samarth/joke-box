/**
 * Fingers on a handwriting page: one finger pans, two pinch to zoom (and pan as they move).
 *
 * Pattern: during a pinch the canvas is only stretched with a CSS transform, which is instant.
 * When the fingers lift, the zoom is committed: the page is redrawn sharp at the new size and
 * scrolled so the spot that was under your fingers is still there.
 *
 * The Pencil wins: touching it down ends any gesture, and fingers that land while it's down
 * (a resting palm) are ignored.
 */
import { type RefObject, useLayoutEffect, useRef } from 'react'
import { MAX_ZOOM, scrollAfterZoom } from './ink'

interface Pinch {
  distance: number
  zoom: number
  scale: number
  pageX: number
  pageY: number
  canvasLeft: number
  canvasTop: number
  frameLeft: number
  /** The pinch so far: the zoom and where the fingers are now. */
  now: { zoom: number; x: number; y: number }
}

type Spot = { x: number; y: number }

const middle = (a: Spot, b: Spot) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const apart = (a: Spot, b: Spot) => Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))

interface Options {
  frameRef: RefObject<HTMLDivElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  zoom: number
  /** CSS pixels per page unit at the current zoom. */
  scale: number
  onZoom: (zoom: number) => void
}

export function useTouchView({ frameRef, canvasRef, zoom, scale, onZoom }: Options) {
  const touches = useRef(new Map<number, Spot>())
  const pinch = useRef<Pinch | null>(null)
  const pen = useRef(false)
  const pendingScroll = useRef<{ left: number; top: number } | null>(null)

  const settle = (to: { left: number; top: number }) => {
    if (canvasRef.current) canvasRef.current.style.transform = ''
    if (frameRef.current) frameRef.current.scrollLeft = to.left
    window.scrollTo(window.scrollX, to.top)
  }

  // Once the page has been redrawn at the new zoom, scroll back to the spot under the fingers.
  useLayoutEffect(() => {
    if (!pendingScroll.current) return
    settle(pendingScroll.current)
    pendingScroll.current = null
  })

  const startPinch = () => {
    const canvas = canvasRef.current
    const frame = frameRef.current
    if (!canvas || !frame) return
    const [a, b] = [...touches.current.values()]
    const focus = middle(a, b)
    const rect = canvas.getBoundingClientRect()
    pinch.current = {
      distance: apart(a, b), zoom, scale,
      pageX: (focus.x - rect.left) / scale, pageY: (focus.y - rect.top) / scale,
      canvasLeft: rect.left, canvasTop: rect.top, frameLeft: frame.getBoundingClientRect().left,
      now: { zoom, ...focus },
    }
  }

  const movePinch = (p: Pinch) => {
    const [a, b] = [...touches.current.values()]
    const focus = middle(a, b)
    const next = Math.min(MAX_ZOOM, Math.max(1, (p.zoom * apart(a, b)) / p.distance))
    const stretch = next / p.zoom
    p.now = { zoom: next, ...focus }
    const x = focus.x - p.canvasLeft - p.pageX * p.scale * stretch
    const y = focus.y - p.canvasTop - p.pageY * p.scale * stretch
    if (canvasRef.current) canvasRef.current.style.transform = `translate(${x}px, ${y}px) scale(${stretch})`
  }

  const endPinch = (p: Pinch, commit: boolean) => {
    pinch.current = null
    // Any finger still down stays out of it, so the page doesn't jump when the pinch ends.
    touches.current.clear()
    if (!commit) return settle({ left: frameRef.current?.scrollLeft ?? 0, top: window.scrollY })
    const to = scrollAfterZoom({
      focusX: p.now.x, focusY: p.now.y, pageX: p.pageX, pageY: p.pageY, frameLeft: p.frameLeft,
      canvasTop: p.canvasTop + window.scrollY, scale: (p.scale * p.now.zoom) / p.zoom,
    })
    if (p.now.zoom === zoom) return settle(to)
    pendingScroll.current = to
    onZoom(p.now.zoom)
  }

  return {
    /** Is this pointer one of the fingers panning or pinching? */
    has: (id: number) => touches.current.has(id),
    fingersDown: () => touches.current.size,
    penActive: () => pen.current,
    penDown() {
      pen.current = true
      if (pinch.current) endPinch(pinch.current, false)
      touches.current.clear()
    },
    penUp() { pen.current = false },
    fingerDown(id: number, spot: Spot) {
      if (pen.current) return
      touches.current.set(id, spot)
      if (touches.current.size === 2) startPinch()
    },
    fingerMove(id: number, spot: Spot) {
      const last = touches.current.get(id)
      if (!last) return
      touches.current.set(id, spot)
      if (pinch.current) return movePinch(pinch.current)
      if (frameRef.current) frameRef.current.scrollLeft -= spot.x - last.x
      window.scrollBy(0, last.y - spot.y)
    },
    fingerUp(id: number) {
      if (!touches.current.delete(id)) return
      if (pinch.current) endPinch(pinch.current, true)
    },
  }
}
