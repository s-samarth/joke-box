/**
 * A time scrubber down the right edge, like a photo app's: a thin track with a tick at each new
 * year and a yellow thumb for the month you're looking at. Press or drag anywhere on it and a
 * bubble names the month under your finger while the list jumps there. With the keyboard it's a
 * slider: arrow keys step a month, Home and End go to either end.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { monthAnchor } from '../../lib/months'

export interface RailMonth {
  key: string
  label: string
}

const section = (scope: string, key: string) => document.getElementById(monthAnchor(scope, key))

/** The box the list scrolls in (the jokes column on desktop), or null when the whole page scrolls. */
function scrollBox(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return null
}

/** The top edge a month counts as "reached" at: just under the list's own scroll box, or under the phone's top bar. */
const topEdge = (el: HTMLElement): number => (scrollBox(el)?.getBoundingClientRect().top ?? 48) + 48

/**
 * Bring a month's section to the top of whatever scrolls it, and only that: `scrollIntoView` would
 * also nudge the page itself. The section's scroll-margin keeps it clear of the phone's top bar.
 */
function reveal(el: HTMLElement) {
  const box = scrollBox(el)
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  if (box) box.scrollTo({ top: box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top })
  else window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - margin })
}

export function TimeRail({ months, scope, className = '' }: { months: RailMonth[]; scope: string; className?: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [drag, setDrag] = useState<number | null>(null)
  const n = months.length

  // Follow the list as it scrolls: the current month is the last one whose heading has passed the top.
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const first = months[0] && section(scope, months[0].key)
      if (!first) return
      const edge = topEdge(first)
      let current = 0
      months.forEach((m, i) => {
        const el = section(scope, m.key)
        if (el && el.getBoundingClientRect().top <= edge) current = i
      })
      setActive(current)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    // Capture catches the scroll of any box on the page, not just the window.
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      cancelAnimationFrame(frame)
    }
  }, [months, scope])

  if (n < 2) return null
  const at = (i: number) => `${((i + 0.5) / n) * 100}%`
  const go = (i: number) => {
    const target = Math.min(n - 1, Math.max(0, i))
    setActive(target)
    const el = section(scope, months[target].key)
    if (el) reveal(el)
    return target
  }
  const indexAt = (y: number) => {
    const r = track.current?.getBoundingClientRect()
    return r ? Math.floor(((y - r.top) / r.height) * n) : 0
  }
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag(go(indexAt(e.clientY)))
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return
    const i = Math.min(n - 1, Math.max(0, indexAt(e.clientY)))
    if (i !== drag) setDrag(go(i))
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key]
    if (step === undefined && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    go(e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : active + (step ?? 0))
  }
  const years = months.flatMap((m, i) => (i === 0 || months[i - 1].key.slice(0, 4) !== m.key.slice(0, 4) ? [{ i, year: m.key.slice(0, 4) }] : []))

  return (
    <div className={`z-20 w-6 select-none ${className}`}>
      <div ref={track} role="slider" tabIndex={0} aria-label="Jump to a month" aria-orientation="vertical"
        aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={active} aria-valuetext={months[active]?.label}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onKeyDown={onKey}
        className="group relative h-full w-full cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-tape">
        <span className="absolute inset-y-0 right-2 w-[3px] rounded-full bg-ink-3 transition group-hover:bg-ink-4" />
        {years.map((y) => <span key={`tick-${y.year}`} className="absolute right-1.5 h-[2px] w-[9px] -translate-y-1/2 rounded-full bg-faint" style={{ top: at(y.i) }} />)}
        {/* Year names show while you hover, focus or drag, so at rest the rail stays out of the way. */}
        {years.map((y) => (
          <span key={`year-${y.year}`} style={{ top: at(y.i) }}
            className={`absolute right-6 -translate-y-1/2 text-[11px] text-dim transition-opacity ${drag === null ? 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100' : 'opacity-100'}`}>
            {y.year}
          </span>
        ))}
        <span className="absolute right-[5px] size-[9px] -translate-y-1/2 rounded-full bg-tape ring-2 ring-ink transition-[top] duration-150" style={{ top: at(active) }} />
        {drag !== null && (
          <span className="absolute right-9 -translate-y-1/2 rounded-lg bg-paper px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-ink shadow-lift" style={{ top: at(drag) }}>
            {months[drag].label}
          </span>
        )}
      </div>
    </div>
  )
}
