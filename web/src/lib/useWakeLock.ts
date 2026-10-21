/**
 * Keep the screen on while `active`: on stage, and while recording (a locked phone stops the mic).
 * The browser drops the lock whenever the app leaves the screen, and can drop it on its own (low
 * battery, say), so it's asked for again on return. Reports how it's going, so a screen can say
 * "Screen stays on" honestly, or warn when the phone said no.
 */
import { useEffect, useState } from 'react'

export type WakeState = 'off' | 'asking' | 'held' | 'refused'

const supported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator

export function useWakeLock(active = true): WakeState {
  const [state, setState] = useState<WakeState>('asking')
  useEffect(() => {
    if (!active || !supported()) return
    let lock: WakeLockSentinel | undefined
    let stopped = false
    const request = async () => {
      setState((s) => (s === 'held' ? s : 'asking'))
      try {
        const next = await navigator.wakeLock.request('screen')
        if (stopped) return void next.release()
        lock = next
        setState('held')
        next.addEventListener('release', () => { if (lock === next && !stopped) setState('refused') })
      } catch {
        if (!stopped) setState('refused') // not visible, low power, or not allowed here
      }
    }
    void request()
    const onVisible = () => document.visibilityState === 'visible' && void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
      setState('asking') // ready for next time
    }
  }, [active])
  if (!active) return 'off'
  return supported() ? state : 'refused' // a browser that can't keep the screen on
}
