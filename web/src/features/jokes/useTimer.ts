/**
 * A start / pause / reset stopwatch counting whole seconds. It counts from the clock, not by
 * adding one a tick, so it stays right while the phone is locked or the app is in the background
 * (the browser slows or stops timers there).
 */
import { useEffect, useState } from 'react'

export function useTimer(initial = 0) {
  const [base, setBase] = useState(initial) // seconds counted before the current run
  const [since, setSince] = useState<number | null>(null) // when the current run started
  const [run, setRun] = useState(0) // whole seconds into the current run

  useEffect(() => {
    if (since === null) return
    // Checked often so the second turns over on time; React skips the render when it hasn't.
    const tick = () => setRun(Math.max(0, Math.floor((Date.now() - since) / 1000)))
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [since])

  const seconds = since === null ? base : base + run
  return {
    seconds,
    running: since !== null,
    start: () => {
      if (since !== null) return
      setRun(0)
      setSince(Date.now())
    },
    pause: () => {
      setBase(seconds)
      setSince(null)
    },
    reset: () => {
      setSince(null)
      setBase(0)
    },
    load: (value: number) => {
      setSince(null)
      setBase(value)
    },
  }
}
