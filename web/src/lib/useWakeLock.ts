/**
 * Keep the screen on while `active`: on stage, and while recording (a locked phone stops the mic).
 * The browser drops the lock whenever the app leaves the screen, so it's asked for again on return.
 */
import { useEffect } from 'react'

export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    const request = () => navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => undefined)
    void request()
    const onVisible = () => document.visibilityState === 'visible' && void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
