/**
 * Knowing when we're really offline. The phone's own signal isn't enough: in a basement with one
 * bar, or on wifi that doesn't reach the internet, `navigator.onLine` says online while every
 * request fails. So a request that can't reach the server also counts as offline, and from then
 * on we ask the server's /health every few seconds until it answers.
 *
 * TanStack Query's `onlineManager` holds the answer. While it says offline, queued saves pause
 * (and are kept on the phone) and resume by themselves once it flips back.
 */
import { onlineManager } from '@tanstack/react-query'

/** A request that never reached the server: no signal, or it took too long. */
export class NetworkError extends Error {
  constructor() {
    super("You're offline. Try again when you have signal.")
  }
}

/** fetch throws a TypeError when there's no connection, and a DOMException when it times out. */
export const isConnectionFailure = (e: unknown): boolean => e instanceof TypeError || e instanceof DOMException

const PROBE_EVERY = 10_000
let probeTimer: ReturnType<typeof setInterval> | undefined

/**
 * Wifi with a sign-in page (venues, cafés) answers every request with its own page until you sign
 * in, so a plain "did something answer" isn't enough: it has to be our server saying ok.
 */
async function serverAnswers(): Promise<boolean> {
  try {
    const response = await fetch('/health', { cache: 'no-store', signal: AbortSignal.timeout(8_000) })
    if (!response.ok || isForeign(response)) return false
    return ((await response.json()) as { status?: string }).status === 'ok'
  } catch {
    return false
  }
}

/** A reply that came from somewhere else: a wifi sign-in page we were redirected to. */
export const isForeign = (response: Response): boolean =>
  response.redirected && new URL(response.url).origin !== location.origin

function stopProbing() {
  clearInterval(probeTimer)
  probeTimer = undefined
}

/** Check now whether the server can be reached, and record the answer. */
async function check() {
  if (!navigator.onLine) return onlineManager.setOnline(false)
  if (await serverAnswers()) {
    stopProbing()
    onlineManager.setOnline(true)
  } else {
    onlineManager.setOnline(false)
    probeTimer ??= setInterval(() => void check(), PROBE_EVERY)
  }
}

/** Called when a request couldn't reach the server: count as offline until /health answers. */
export function lostConnection() {
  if (!onlineManager.isOnline()) return
  onlineManager.setOnline(false)
  void check()
}

export const isOnline = (): boolean => onlineManager.isOnline()

// Start from the phone's own answer (flight mode is offline from the first moment), then check
// again whenever the phone says the connection is back or the app comes back to the front.
if (typeof window !== 'undefined') {
  onlineManager.setEventListener((setOnline) => {
    setOnline(navigator.onLine)
    const offline = () => {
      stopProbing()
      setOnline(false)
    }
    const recheck = () => {
      if (document.visibilityState === 'visible' && !onlineManager.isOnline()) void check()
    }
    window.addEventListener('offline', offline)
    window.addEventListener('online', recheck)
    document.addEventListener('visibilitychange', recheck)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', recheck)
      document.removeEventListener('visibilitychange', recheck)
    }
  })
}
