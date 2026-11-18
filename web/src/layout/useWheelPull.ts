/**
 * Pull to refresh on a laptop: at the very top of a screen, keep swiping down on the trackpad (or
 * scrolling up on a mouse) and the same arrow comes down. Letting go past the mark refreshes once
 * the swipe, and the momentum after it, have stopped. A swipe has to start with the page already at
 * the top: one that scrolls up and hits the top on its way (a flick, or its momentum) never pulls.
 * Returns how far the indicator has travelled.
 */
import { useEffect, useRef, useState } from 'react'
import { canPullFrom, PULL_TRIGGER, pullDistance, WHEEL_DRAG, wheelPixels } from '../lib/pull'

/** A pause this long between wheel events ends one swipe (momentum events come every ~16 ms). */
const GESTURE_GAP = 250

export function useWheelPull(onRefresh: () => void): number {
  const [distance, setDistance] = useState(0)
  const refresh = useRef(onRefresh)
  useEffect(() => { refresh.current = onRefresh }, [onRefresh])

  useEffect(() => {
    let pulled = 0
    let pulling = false
    let last = 0
    let ended: ReturnType<typeof setTimeout> | undefined
    const reset = () => {
      pulled = 0
      setDistance(0)
    }
    const end = () => {
      if (pulling && pullDistance(pulled / WHEEL_DRAG * 2) >= PULL_TRIGGER) refresh.current()
      pulling = false
      reset()
    }
    const wheel = (e: WheelEvent) => {
      const now = performance.now()
      if (now - last > GESTURE_GAP) {
        // A new swipe: it may pull only if it starts at the top, somewhere a drag means nothing else.
        pulling = window.scrollY <= 0 && !e.ctrlKey && !document.body.hasAttribute('data-scroll-locked') && canPullFrom(e.target as Element, 0)
        reset()
      }
      last = now
      clearTimeout(ended)
      ended = setTimeout(end, GESTURE_GAP)
      if (!pulling) return
      const dy = wheelPixels(e.deltaY, e.deltaMode)
      if (dy > 0 || window.scrollY > 0) {
        pulling = false
        return reset()
      }
      pulled -= dy
      setDistance(pullDistance(pulled / WHEEL_DRAG * 2))
    }
    window.addEventListener('wheel', wheel, { passive: true })
    return () => {
      window.removeEventListener('wheel', wheel)
      clearTimeout(ended)
    }
  }, [])
  return distance
}
