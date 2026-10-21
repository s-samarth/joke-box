/** Picking the sets you did at a show ticks their topics. */
import type { Bit, Setlist } from '../../api/types'

/** Topics of the bits in these sets, each once. */
export function setTopics(chosen: Setlist[], bits: Bit[]): string[] {
  const topicOf = new Map(bits.map((b) => [b.id, b.topic_id]))
  const ids = chosen.flatMap((s) => s.items.map((i) => topicOf.get(i.bit_id)))
  return [...new Set(ids.filter((t): t is string => Boolean(t)))]
}

/**
 * Topics after the chosen sets change: the old sets' topics go, the new sets' topics come in, and
 * anything you picked by hand stays.
 */
export function swapTopics(current: string[], before: string[], after: string[]): string[] {
  return [...new Set([...current.filter((t) => !before.includes(t)), ...after])]
}
