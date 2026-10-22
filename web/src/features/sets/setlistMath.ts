/** Timing and labels for a set. Opener and closer are simply the first and last bit. */

export interface DraftItem {
  bitId: string
  duration: number
  /** One to cut if time is short: not counted towards the slot. */
  optional?: boolean
}

/** The set's running time: the jokes you'll do for sure. */
export const totalSeconds = (items: DraftItem[]): number =>
  items.reduce((sum, item) => sum + (item.optional ? 0 : item.duration), 0)

/** Time in the optional jokes, shown beside the total. */
export const optionalSeconds = (items: DraftItem[]): number =>
  items.reduce((sum, item) => sum + (item.optional ? item.duration : 0), 0)

/** A saved set's items in the shape the timing works on. */
export const draftItems = (items: { bit_id: string; duration_seconds: number; optional?: boolean }[]): DraftItem[] =>
  items.map((i) => ({ bitId: i.bit_id, duration: i.duration_seconds, optional: i.optional ?? false }))

export function positionLabel(index: number, count: number): 'Opener' | 'Closer' | null {
  if (index === 0) return 'Opener'
  if (index === count - 1) return 'Closer'
  return null
}

/** Share of the target used, capped at 100 for the bar; `over` turns it amber. */
export function progress(total: number, target: number) {
  const ratio = target > 0 ? total / target : 0
  return { percent: Math.round(ratio * 100), bar: Math.min(100, ratio * 100), over: target > 0 && total > target }
}

/** Where the set stands against the slot: room to spare, inside the last minute, or over. */
export function lightState(total: number, target: number): 'ok' | 'light' | 'over' {
  if (target <= 0) return 'ok'
  if (total > target) return 'over'
  return target - total <= 60 ? 'light' : 'ok'
}

export function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
