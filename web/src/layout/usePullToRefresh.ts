/**
 * Pull down at the top of any screen to refresh, on a phone or iPad (anything with touch).
 * The page itself is the scroller and doesn't bounce (overscroll-behavior: none in app.css), so a
 * downward drag at the top would otherwise do nothing. The listeners are passive: they only watch,
 * so scrolling stays smooth. A touch something else already handled (the brainstorm canvas, a
 * card being dragged) is ignored: those cancel their own touches. Returns how far the indicator
 * has travelled.
 */
import { useEffect, useRef, useState } from 'react'
import { canPullFrom, PULL_TRIGGER, pullDistance } from '../lib/pull'

/** A dialog or sheet is open: the page under it is locked and mustn't refresh. */
const locked = () => document.body.hasAttribute('data-scroll-locked')

export function usePullToRefresh(onRefresh: () => void): number {
  const [distance, setDistance] = useState(0)
  const refresh = useRef(onRefresh)
  useEffect(() => { refresh.current = onRefresh }, [onRefresh])

  useEffect(() => {
    let startY: number | null = null
    let travelled = 0
    const reset = () => {
      startY = null
      travelled = 0
      setDistance(0)
    }
    const start = (e: TouchEvent) => {
      const ok = e.touches.length === 1 && !e.defaultPrevented && !locked() && canPullFrom(e.target as Element, window.scrollY)
      startY = ok ? e.touches[0].clientY : null
    }
    const move = (e: TouchEvent) => {
      if (startY === null) return
      if (e.touches.length !== 1 || e.defaultPrevented || window.scrollY > 0) return reset()
      travelled = pullDistance(e.touches[0].clientY - startY)
      setDistance(travelled)
    }
    const end = () => {
      if (startY !== null && travelled >= PULL_TRIGGER) refresh.current()
      reset()
    }
    const options = { passive: true }
    window.addEventListener('touchstart', start, options)
    window.addEventListener('touchmove', move, options)
    window.addEventListener('touchend', end, options)
    window.addEventListener('touchcancel', reset, options)
    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', reset)
    }
  }, [])
  return distance
}
