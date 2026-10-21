/**
 * The message after a save, said honestly. On one bar of signal the phone still says "online",
 * so "Show logged" could appear for a save that's really waiting. This waits up to 1.5 s for the
 * server: confirmed in time, it says `saved`; offline, or slower than that, it says the save is
 * on the phone and will sync. A failure says nothing here: the caller reports it.
 */
import { isOnline } from '../api/network'
import type { ToastAction } from '../components/ui/feedbackContext'

export const SAVED_OFFLINE = 'Saved offline, will sync'
const WAIT = 1_500

type Toast = (message: string, action?: ToastAction) => void

/** `saved` null: say nothing when it went through (quiet saves), only when it's waiting. */
export function announceSave(saving: Promise<unknown>, toast: Toast, saved: string | null, action?: ToastAction) {
  if (!isOnline()) return toast(SAVED_OFFLINE, action)
  const outcome = saving.then(() => 'saved' as const, () => 'failed' as const)
  const slow = new Promise<'slow'>((resolve) => setTimeout(resolve, WAIT, 'slow'))
  void Promise.race([outcome, slow]).then((result) => {
    if (result === 'failed') return
    if (result === 'slow') toast(SAVED_OFFLINE, action)
    else if (saved) toast(saved, action)
  })
}
