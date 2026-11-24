/**
 * The line between a SplitView's list and its open item, which you drag to give the list more of
 * the screen, like the divider in Apple Mail. Double-click puts it back; with focus, the arrow keys
 * move it. It only moves within the bounds splitWidth.ts sets, so the open item never shrinks.
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { shareFor, widthFor, type Bounds } from './splitWidth'

interface Props {
  share: number
  bounds: Bounds
  /** While dragging: the new share, to show at once. */
  onChange: (share: number) => void
  /** Let go (or a key press): the share to remember. */
  onCommit: (share: number) => void
  /** Double-click: back to the default. */
  onReset: () => void
}

const STEP = 0.05

export function SplitDivider({ share, bounds, onChange, onCommit, onReset }: Props) {
  const start = useRef<{ x: number; width: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const shareAt = (e: PointerEvent) => (start.current ? shareFor(start.current.width + e.clientX - start.current.x, bounds) : share)

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault() // no text selected along the way
    start.current = { x: e.clientX, width: widthFor(share, bounds) }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const move = (e: PointerEvent) => {
    if (start.current) onChange(shareAt(e))
  }
  const up = (e: PointerEvent) => {
    if (!start.current) return
    onCommit(shareAt(e))
    start.current = null
    setDragging(false)
  }
  const key = (e: KeyboardEvent) => {
    const by = e.key === 'ArrowLeft' ? -STEP : e.key === 'ArrowRight' ? STEP : 0
    if (!by) return
    e.preventDefault()
    onCommit(Math.min(1, Math.max(0, share + by)))
  }

  return (
    <div role="separator" aria-orientation="vertical" aria-label="Resize the list" title="Drag to resize. Double-click to reset."
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} tabIndex={0}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={onReset} onKeyDown={key}
      className={`group relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize touch-none outline-none select-none`}>
      <span className={`absolute inset-y-0 left-1/2 -translate-x-1/2 transition-[width,background-color] ${dragging ? 'w-0.5 bg-tape' : 'w-px bg-rule group-hover:w-0.5 group-hover:bg-tape group-focus-visible:w-0.5 group-focus-visible:bg-tape'}`} />
    </div>
  )
}
