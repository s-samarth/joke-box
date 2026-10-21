/**
 * Asking the phone to keep our storage. Saves waiting to sync live in IndexedDB, and a browser
 * may clear a site's storage when space runs low, or (Safari, for a site not added to the Home
 * Screen) after about a week unused. Persistent storage opts out of the first; installing the
 * app opts out of the second.
 */

/** Ask once at launch. Browsers grant it quietly (installed apps, sites you use) or say no. */
export async function keepStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

/** Opened from the Home Screen (or installed), rather than in a browser tab. */
export const isInstalled = (): boolean =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** A phone or tablet: where a browser tab is most likely to have its storage cleared. */
export const isTouchDevice = (): boolean => matchMedia('(pointer: coarse)').matches
