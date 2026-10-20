/** Timing and labels for a set. Opener and closer are simply the first and last bit. */

export interface DraftItem {
  bitId: string
  duration: number
}

export const totalSeconds = (items: DraftItem[]): number =>
  items.reduce((sum, item) => sum + item.duration, 0)

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
