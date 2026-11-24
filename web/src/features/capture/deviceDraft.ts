/** Unsaved text belongs to one signed-in comic on this device. A blocked store leaves
 * the editor usable. Signing out clears all of these slots along with the offline queue. */
import { keys, queryClient } from '../../api/queryClient'
import type { Me } from '../../api/types'

const PREFIX = 'jokebox.draft.'
export function draftKey(slot: string): string | null {
  const owner = queryClient.getQueryData<Me>(keys.me)?.id
  return owner ? PREFIX + owner + '.' + slot : null
}

export function readText(key: string | null): string {
  try { return key ? localStorage.getItem(key) ?? '' : '' } catch { return '' }
}

export function writeText(key: string | null, text: string): boolean {
  if (!key) return false
  try {
    if (text) localStorage.setItem(key, text)
    else localStorage.removeItem(key)
    return true
  } catch { return false }
}

export function clearDeviceDrafts() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key)
  } catch { /* storage unavailable */ }
}
