/**
 * Service worker lifecycle: install -> waiting -> activate. A new version installs in the
 * background but waits, so the open app never changes under you. This banner lets you
 * switch to the waiting version with one tap (fixing the old "stuck on an old build" bug).
 */
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '../components/ui/Button'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
let lastCheck = Date.now()

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Check for a new version every hour while the app stays open, and each time it comes back
      // to the front: an installed app on a phone is mostly resumed, not opened, and the phone
      // pauses the hourly timer while it's in the background.
      setInterval(() => void registration.update(), HOUR)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || Date.now() - lastCheck < MINUTE) return
        lastCheck = Date.now()
        void registration.update().catch(() => {}) // offline: the next return tries again
      })
    },
  })
  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-3 bottom-24 z-[55] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink-3 p-3 pl-4 shadow-lift ring-1 ring-rule-strong lg:bottom-8">
      <p className="flex-1 text-sm">A new version of JokeBox is ready.</p>
      <Button small variant="quiet" onClick={() => setNeedRefresh(false)}>Later</Button>
      <Button small variant="tape" onClick={() => void updateServiceWorker(true)}>Update now</Button>
    </div>
  )
}
