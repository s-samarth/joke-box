/**
 * Whether a finger draws on handwriting pages, remembered on this device. A phone has no
 * Pencil, so fingers draw until this device first sees one; from then on fingers scroll and
 * zoom and only the Pencil writes, as in OneNote. The toolbar switch overrides either way.
 *
 * Kept in localStorage: it's a per-device habit, not something to sync.
 */
const CHOICE_KEY = 'jokebox.brainstorm.finger'
const PENCIL_KEY = 'jokebox.brainstorm.pencil-seen'

const read = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const write = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* private mode */ } }

export function fingerDraws(): boolean {
  const choice = read(CHOICE_KEY)
  if (choice) return choice === 'on'
  return read(PENCIL_KEY) !== 'yes'
}

export const chooseFingerDraws = (on: boolean) => write(CHOICE_KEY, on ? 'on' : 'off')

/** Called when a Pencil touches a page. */
export const pencilSeen = () => write(PENCIL_KEY, 'yes')
