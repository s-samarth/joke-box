/**
 * Puts the page where you'd expect after moving between screens: a new screen at its top, and
 * a screen you return to where you left it (the rules are scrollAfter's, in lib/scrollMemory.ts).
 * Called once, in App.
 *
 * It watches the window's own scroll, which is what a phone and an upright iPad scroll. On wider
 * screens the lists and the open item scroll inside their own columns (see SplitView), which
 * keep their place by staying on screen.
 */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'
import { newMemory, remember, scrollAfter, type Place } from '../lib/scrollMemory'

/** How long to wait for a screen still loading to grow tall enough to scroll back into (frames). */
const PATIENCE = 90

const reach = () => document.documentElement.scrollHeight - window.innerHeight
const jump = (y: number) => window.scrollTo({ top: y, behavior: 'instant' })

/**
 * Scroll to `y`, waiting for the screen to be tall enough if it's still loading. Returns a way
 * to give up, which a touch, a wheel or a key also does: you've started scrolling yourself.
 */
function settle(y: number, done: () => void): () => void {
  jump(y)
  if (y === 0 || reach() >= y) {
    done()
    return () => {}
  }
  let frame = 0
  let left = PATIENCE
  const stop = () => {
    cancelAnimationFrame(frame)
    for (const type of ['touchstart', 'wheel', 'keydown']) window.removeEventListener(type, stop)
    done()
  }
  const tick = () => {
    if (reach() >= y || --left <= 0) {
      jump(y)
      stop()
    } else frame = requestAnimationFrame(tick)
  }
  for (const type of ['touchstart', 'wheel', 'keydown']) window.addEventListener(type, stop, { passive: true })
  frame = requestAnimationFrame(tick)
  return stop
}

export function useScrollMemory(): void {
  const location = useLocation()
  const kind = useNavigationType()
  const memory = useRef(newMemory())
  const here = useRef<Place | null>(null)
  // While a screen is being scrolled back into place, its scroll isn't where you left it yet.
  const settling = useRef(false)
  const giveUp = useRef(() => {})

  useEffect(() => {
    // We restore Back ourselves: the browser tries before the screen has been drawn.
    const before = history.scrollRestoration
    history.scrollRestoration = 'manual'
    const onScroll = () => {
      if (here.current && !settling.current) remember(memory.current, here.current, window.scrollY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      history.scrollRestoration = before
    }
  }, [])

  const { key, pathname, search } = location
  useLayoutEffect(() => {
    giveUp.current()
    const to: Place = { key, pathname, search }
    const y = scrollAfter(kind, here.current, to, memory.current)
    here.current = to
    remember(memory.current, to, y ?? window.scrollY)
    if (y === null) return
    settling.current = true
    giveUp.current = settle(y, () => { settling.current = false })
    // One run per move: `kind` belongs to the move that changed the key.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
