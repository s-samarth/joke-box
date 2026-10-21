/**
 * On a phone, in a browser tab: suggest adding JokeBox to the Home Screen, where the phone keeps
 * offline saves safe (a Safari tab's storage can be cleared after a week unused). Shows until
 * you install or dismiss it.
 */
import { Share, X } from 'lucide-react'
import { useState } from 'react'
import { isInstalled, isTouchDevice } from '../../lib/keepStorage'

const DISMISSED = 'jokebox.installHint.dismissed'

function dismissed(): boolean {
  try { return localStorage.getItem(DISMISSED) === '1' } catch { return false }
}

export function InstallHint() {
  const [hidden, setHidden] = useState(() => isInstalled() || !isTouchDevice() || dismissed())
  if (hidden) return null
  const dismiss = () => {
    try { localStorage.setItem(DISMISSED, '1') } catch { /* it just shows again next time */ }
    setHidden(true)
  }
  return (
    <div className="mt-6 flex items-start gap-3 rounded-xl bg-ink-2 p-4 ring-1 ring-rule">
      <Share size={20} className="mt-0.5 shrink-0 text-tape" />
      <p className="flex-1 text-sm text-dim">
        <span className="font-medium text-paper">Add JokeBox to your Home Screen.</span> As an app, your phone keeps
        saves made offline safe; in a browser tab, they can be cleared after a week unused. In Safari: Share, then Add to Home Screen.
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="-m-1 rounded-lg p-1 text-faint hover:text-paper"><X size={18} /></button>
    </div>
  )
}
