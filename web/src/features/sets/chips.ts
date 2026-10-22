/** A tag as a pill you tap on or off: filled when it's on. */
export const tagChip = (on: boolean) =>
  `h-8 shrink-0 rounded-full px-3 text-sm transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`
