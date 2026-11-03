/**
 * Fingers on a handwriting page: one finger scrolls (a flick keeps it gliding, see glide.ts).
 * Two fingers scroll too, or pinch to zoom: whichever they clearly do first (see gestures.ts).
 * Pinched out all the way, the whole double-width page fits on screen.
 *
 * Pattern: during a pinch the canvas is only stretched with a CSS transform, which is instant.
 * When the fingers lift, the zoom is committed: the page is redrawn sharp at the new size and
 * scrolled so the spot that was under your fingers is still there.
 *
 * The Pencil wins: touching it down ends any gesture, and fingers that land while it's down
 * (a resting palm) are ignored.
 */
import { type RefObject, useLayoutEffect, useRef } from 'react'
import { apart, framePanner, middle, snapZoom, type Spot, twoFingers } from './gestures'
import { flingVelocity, glide, type Sample } from './glide'
import { MAX_ZOOM, MIN_ZOOM, scrollAfterZoom } from './ink'

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
  /** Where the panning finger has been lately, for the speed of a flick. */
  const trail = useRef<Sample[]>([])
  const gliding = useRef<(() => void) | null>(null)
  const stopGlide = () => { gliding.current?.(); gliding.current = null }
  const scrollBy = (dx: number, dy: number) => {
    if (frameRef.current) frameRef.current.scrollLeft += dx
    window.scrollBy(0, dy)
  }
  // A dragging finger's movements, applied once a frame in whole pixels.
  const panner = useRef<ReturnType<typeof framePanner> | null>(null)
  const panBy = (dx: number, dy: number) => { panner.current ??= framePanner(scrollBy); panner.current.add(dx, dy) }
  /** Two fingers down: where they landed, and whether they've turned out to be scrolling. */
  const pair = useRef<{ start: [Spot, Spot]; scrolling: boolean } | null>(null)
  const twoDown = () => [...touches.current.values()].slice(0, 2) as [Spot, Spot]

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
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (p.zoom * apart(a, b)) / p.distance))
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
    const target = snapZoom(p.now.zoom)
    const to = scrollAfterZoom({
      focusX: p.now.x, focusY: p.now.y, pageX: p.pageX, pageY: p.pageY, frameLeft: p.frameLeft,
      canvasTop: p.canvasTop + window.scrollY, scale: (p.scale * target) / p.zoom,
    })
    if (target === zoom) return settle(to)
    pendingScroll.current = to
    onZoom(target)
  }

  return {
    /** Is this pointer one of the fingers panning or pinching? */
    has: (id: number) => touches.current.has(id),
    fingersDown: () => touches.current.size,
    penActive: () => pen.current,
    /** Anything touching the page stops a glide. */
    stopGlide,
    penDown() {
      stopGlide()
      pen.current = true
      if (pinch.current) endPinch(pinch.current, false)
      pair.current = null
      touches.current.clear()
    },
    penUp() { pen.current = false },
    fingerDown(id: number, spot: Spot) {
      stopGlide()
      if (pen.current) return
      touches.current.set(id, spot)
      if (touches.current.size === 1) {
        panner.current?.reset()
        trail.current = [{ t: performance.now(), ...spot }]
      }
      if (touches.current.size === 2) {
        pair.current = { start: twoDown(), scrolling: false }
        trail.current = []
      }
    },
    fingerMove(id: number, spot: Spot) {
      const last = touches.current.get(id)
      if (!last) return
      const two = touches.current.size === 2 ? pair.current : null
      const before = two ? middle(...twoDown()) : last
      touches.current.set(id, spot)
      if (pinch.current) return movePinch(pinch.current)
      if (touches.current.size > 2 || (touches.current.size === 2 && !two)) return
      let from = before
      let to = spot
      if (two) {
        const now = twoDown()
        to = middle(...now)
        if (!two.scrolling) {
          const intent = twoFingers(two.start, now)
          if (intent === 'pinch') {
            pair.current = null
            return startPinch()
          }
          if (!intent) return
          two.scrolling = true
          from = middle(...two.start) // catch up with how far they've already moved
        }
      }
      panBy(from.x - to.x, from.y - to.y)
      const t = performance.now()
      trail.current = [...trail.current.filter((s) => t - s.t < 150), { t, ...to }]
    },
    fingerUp(id: number) {
      if (!touches.current.delete(id)) return
      if (pinch.current) return endPinch(pinch.current, true)
      const two = pair.current
      if (two) {
        // The other finger stays out of it, as after a pinch, so the page doesn't jump.
        pair.current = null
        touches.current.clear()
        if (!two.scrolling) return
      }
      const fling = touches.current.size === 0 && flingVelocity(trail.current, performance.now())
      if (fling) gliding.current = glide(fling, scrollBy)
    },
  }
}
