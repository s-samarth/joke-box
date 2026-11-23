/** A chip you pick from a few, like a strength's Unrated, a type or a premise's status. */
export const choice = (on: boolean) =>
  `hit relative h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`
