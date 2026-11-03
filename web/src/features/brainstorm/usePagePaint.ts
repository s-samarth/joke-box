/**
 * Keeps a handwriting canvas showing its page, redrawing as little as possible.
 *
 * Why: the page used to be cleared and redrawn on every render of the session (the timer ticks
 * each second, "Saving…" comes and goes), which wiped the stroke being written until the pen
 * lifted, and resizing a canvas of millions of pixels each time made the writing stutter.
 *
 * Pattern: remember which strokes are on the canvas. A new list that only adds to them (a
 * finished stroke) draws just the new ones; the same strokes in a new list draw nothing. Only an
 * erase, an undo, a page change or a new size redraws everything, and then the stroke still
 * being written goes back on top. The canvas is resized only when its size changes, since
 * resizing wipes it.
 */
import { type RefObject, useCallback, useLayoutEffect, useRef } from 'react'
import type { Stroke } from '../../api/types'
import { drawStroke, drawTail, pixelRatio } from './ink'

interface Options {
  canvasRef: RefObject<HTMLCanvasElement | null>
  /** This page's finished strokes. */
  strokes: Stroke[]
  /** The stroke being written right now, if any. */
  live: RefObject<Stroke | null>
  cssWidth: number
  height: number
  /** CSS pixels per page unit. */
  scale: number
}

const sameStart = (start: Stroke[], all: Stroke[]) => start.length <= all.length && start.every((s, i) => all[i] === s)

export function usePagePaint({ canvasRef, strokes, live, cssWidth, height, scale }: Options) {
  const drawn = useRef<{ strokes: Stroke[]; scale: number }>({ strokes: [], scale: 0 })
  const latest = useRef({ strokes, cssWidth, height, scale })
  useLayoutEffect(() => { latest.current = { strokes, cssWidth, height, scale } })

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    const { strokes, cssWidth, height, scale } = latest.current
    if (!ctx) return
    ctx.clearRect(0, 0, cssWidth, height)
    for (const s of strokes) drawStroke(ctx, s, scale)
    if (live.current) drawStroke(ctx, live.current, scale, true)
    drawn.current = { strokes, scale }
  }, [canvasRef, live])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !cssWidth) return
    const dpr = pixelRatio(cssWidth, height, window.devicePixelRatio || 1)
    const w = Math.floor(cssWidth * dpr)
    const h = Math.floor(height * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w // resizing wipes the canvas and its settings
      canvas.height = h
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return redraw()
    }
    const before = drawn.current
    if (before.scale !== scale || !sameStart(before.strokes, strokes)) return redraw()
    for (const s of strokes.slice(before.strokes.length)) drawStroke(ctx, s, scale)
    drawn.current = { strokes, scale }
  }, [canvasRef, redraw, strokes, cssWidth, height, scale])

  return {
    /** Redraw the whole page (a half-drawn finger stroke was dropped). */
    redraw,
    /** The pen lifted: finish the stroke on the canvas, where it already is, and count it as drawn. */
    finished(stroke: Stroke, all: Stroke[]) {
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) drawTail(ctx, stroke, latest.current.scale)
      const before = drawn.current.strokes
      if (before.length === all.length - 1 && sameStart(before, all)) drawn.current = { strokes: all, scale: drawn.current.scale }
    },
  }
}
