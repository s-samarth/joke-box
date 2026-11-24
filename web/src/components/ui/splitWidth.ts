/**
 * How wide the list in a SplitView is on a wide screen (1280px and up). The open item reads at
 * 42rem (max-w-2xl) inside 2.5rem of padding each side, plus the pane's scrollbar where it takes
 * room, so anything past 48rem in its pane is empty margin. The list may take that margin and
 * nothing more: dragging the divider never squeezes the open joke, premise or observation below
 * its own width.
 *
 * The width is kept as a share of that spare room (0 = the list at its narrowest, 1 = all of it),
 * so the same choice fits a laptop and a big monitor. It starts at half.
 */

/** Today's list width, the narrowest it gets. */
export const LIST_MIN_REM = 26
/** What the open item's pane needs: 42rem of content, 2.5rem of padding each side, 1rem for a scrollbar. */
export const PANE_REM = 48
/** A new device starts with the list taking half the spare room. */
export const DEFAULT_SHARE = 0.5

export interface Bounds {
  min: number
  max: number
}

/** The list's narrowest and widest, in px, for a split this wide. Equal when there's no room to spare. */
export function listBounds(container: number, rem = 16): Bounds {
  const min = LIST_MIN_REM * rem
  return { min, max: Math.max(min, container - PANE_REM * rem) }
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** The list's width in px for a share of the spare room. */
export const widthFor = (share: number, b: Bounds): number => Math.round(b.min + clamp01(share) * (b.max - b.min))

/** The share a width in px stands for (0 when there's no room to spare). */
export const shareFor = (width: number, b: Bounds): number => (b.max > b.min ? clamp01((width - b.min) / (b.max - b.min)) : 0)

const key = (noun: string) => `jokebox.split.${noun}`

/** The share chosen on this device for one list (a habit, like the brainstorm pen: it never syncs). */
export function savedShare(noun: string): number {
  try {
    const n = Number.parseFloat(localStorage.getItem(key(noun)) ?? '')
    return Number.isFinite(n) ? clamp01(n) : DEFAULT_SHARE
  } catch {
    return DEFAULT_SHARE
  }
}

/** Remember a share, or forget it (null) to go back to the default. */
export function saveShare(noun: string, share: number | null): void {
  try {
    if (share == null) localStorage.removeItem(key(noun))
    else localStorage.setItem(key(noun), String(Math.round(share * 1000) / 1000))
  } catch {
    // Private mode: the width just isn't remembered.
  }
}
