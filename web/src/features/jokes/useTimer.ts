/** A start / pause / reset stopwatch counting whole seconds. */
import { useEffect, useState } from 'react'

export function useTimer(initial = 0) {
  const [seconds, setSeconds] = useState(initial)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  return {
    seconds,
    running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: () => {
      setRunning(false)
      setSeconds(0)
    },
    load: (value: number) => {
      setRunning(false)
      setSeconds(value)
    },
  }
}
