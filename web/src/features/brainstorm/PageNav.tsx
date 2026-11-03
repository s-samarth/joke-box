/**
 * A bar that floats at the bottom of the screen while you handwrite, so it's always in reach:
 * a slider showing which part of the double-width page is on screen (drag it, or tap where to
 * go), and, when zoomed, the zoom with a tap back to fit.
 *
 * Pattern: the slider is a pointer-captured strip. Pressing on it grabs the pointer, so the drag
 * keeps working even if the finger slides off the strip; each move sets the page's scroll.
 */
import type React from 'react'

interface Props {
  /** How wide the view is, how wide the page is, and how far across the view is, in CSS pixels. */
  shown: number
  total: number
  at: number
  onPan: (left: number) => void
  zoom: number
  onFit: () => void
}

const EDGE = 12 // the slider's padding, in pixels: a bigger target than the visible bar

export function PageNav({ shown, total, at, onPan, zoom, onFit }: Props) {
  const pans = total > shown + 1
  if (!pans && zoom === 1) return null
  const thumb = shown / total
  const room = total - shown
  // Centre the thumb on the finger, kept inside the bar.
  const panTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const fraction = (e.clientX - r.left - EDGE) / (r.width - 2 * EDGE) - thumb / 2
    onPan(Math.max(0, Math.min(1 - thumb, fraction)) * total)
  }
  const onKey = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -shown / 2, ArrowRight: shown / 2, Home: -total, End: total }[e.key]
    if (step === undefined) return
    e.preventDefault()
    onPan(Math.max(0, Math.min(room, at + step)))
  }
  return (
    <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center">
      <div className="pointer-events-auto mb-4 flex items-center gap-1 rounded-full bg-ink-3/95 p-1 shadow-lift ring-1 ring-rule-strong backdrop-blur">
        {pans && (
          <div role="scrollbar" aria-label="Move across the page" aria-orientation="horizontal" tabIndex={0}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={room ? Math.round((at / room) * 100) : 0}
            onKeyDown={onKey} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); panTo(e) }}
            onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) panTo(e) }}
            className="relative h-10 w-44 cursor-grab touch-none rounded-full active:cursor-grabbing sm:w-56">
            <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink-4" style={{ left: EDGE, right: EDGE }} />
            <div className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-paper/80"
              style={{ left: `calc(${EDGE}px + ${at / total} * (100% - ${2 * EDGE}px))`, width: `calc(${thumb} * (100% - ${2 * EDGE}px))` }} />
          </div>
        )}
        {zoom !== 1 && (
          <button type="button" onClick={onFit} aria-label="Zoom back to fit"
            className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm tabular hover:bg-ink-4">
            {Math.round(zoom * 100)}%<span className="text-dim">Fit</span>
          </button>
        )}
      </div>
    </div>
  )
}
