/**
 * How many beats (and, for the persona field, jokes) use a label option, so deleting one says
 * what turns to Not sure before it happens. Counted from the ids as stored: a beat whose option
 * was already deleted doesn't count again.
 */
import type { Beat, Joke, SetField } from '../../api/types'

export interface Usage { beats: number; sets: number; jokes: number }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Uses of any of `optionIds` in `field`: beats across sets, and jokes when it's the persona. */
export function optionUsage(field: SetField, optionIds: string[], sets: { beats?: Beat[] }[], jokes: Joke[]): Usage {
  const ids = new Set(optionIds)
  let beats = 0, inSets = 0
  for (const s of sets) {
    const n = (s.beats ?? []).filter((b) => ids.has(b.labels[field.id] ?? '')).length
    beats += n
    if (n) inSets++
  }
  const onJokes = field.role === 'persona' ? jokes.filter((j) => ids.has(j.persona ?? '')).length : 0
  return { beats, sets: inSets, jokes: onJokes }
}

/** "3 beats in 2 sets and 4 jokes", or '' when nothing uses it. */
export function usageText(u: Usage): string {
  const parts = [u.beats ? `${plural(u.beats, 'beat')} in ${plural(u.sets, 'set')}` : '', u.jokes ? plural(u.jokes, 'joke') : ''].filter(Boolean)
  return parts.join(' and ')
}
