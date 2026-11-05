/**
 * Filter menus in one row that scrolls sideways when it runs out of room, instead of stacking into
 * three. The edge with more to see fades out, and a mouse wheel scrolls it too.
 */
import { useEffect, useRef, useState, type ReactNode, type WheelEvent } from 'react'

const fade = (start: boolean, end: boolean) =>
  `linear-gradient(to right, ${start ? 'transparent, #000 1.5rem' : '#000'}, ${end ? '#000 calc(100% - 1.5rem), transparent' : '#000'})`

export function ChipRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const scroller = useRef<HTMLDivElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ start: false, end: false })

  useEffect(() => {
    const el = scroller.current
    if (!el || !row.current) return
    const check = () => setMore({ start: el.scrollLeft > 2, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
    const watch = new ResizeObserver(check)
    watch.observe(el)
    watch.observe(row.current)
    el.addEventListener('scroll', check, { passive: true })
    return () => {
      watch.disconnect()
      el.removeEventListener('scroll', check)
    }
  }, [])

  // A mouse wheel only scrolls up and down; turn that sideways while there's more to see.
  const onWheel = (e: WheelEvent) => {
    const el = scroller.current
    if (el && (more.start || more.end) && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY
  }

  const mask = more.start || more.end ? fade(more.start, more.end) : undefined
  return (
    <div ref={scroller} onWheel={onWheel} className={`overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <div ref={row} className="flex w-max gap-2">{children}</div>
    </div>
  )
}
