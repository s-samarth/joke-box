/** The width there is to lay out in: islands on the board and webs wrap at it, so a phone stacks them. */
import { useEffect, useState, type RefObject } from 'react'

export function useRoom(scroller: RefObject<HTMLDivElement | null>) {
  // A first guess from the window, so a phone doesn't start laid out for a desktop.
  const [room, setRoom] = useState(() => window.innerWidth - 64)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const watch = new ResizeObserver(() => setRoom(el.clientWidth - 32))
    watch.observe(el)
    return () => watch.disconnect()
  }, [scroller])
  return room
}
