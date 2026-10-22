/** Pure helpers for the watchlist: the three scores, grouping, filtering, and watch links. */
import type { WatchItem, WatchItemInput } from '../../api/types'

/** The three scores, each 0-10. */
export const SCORES = [
  { key: 'schemer_index', short: 'SI', name: 'Schemer Index', hint: "How well the routine embodies the forensic, loophole-finding 'System Hacker' mindset." },
  { key: 'logic_density', short: 'LD', name: 'Logic Density', hint: 'How tightly the comedy is built on reasoning chains rather than physical humour.' },
  { key: 'dark_pragmatism', short: 'DP', name: 'Dark Pragmatism', hint: "How far it pushes taboos with logic, into 'Calculated Apathy' territory." },
] as const

export type WatchFilter = 'all' | 'todo' | 'watched'

export const OWN_CATEGORY = 'Your additions'

export const toInput = ({ title, comedian, category, description, url, position, schemer_index, logic_density, dark_pragmatism, watched }: WatchItem): WatchItemInput =>
  ({ title, comedian, category, description, url, position, schemer_index, logic_density, dark_pragmatism, watched })

export interface Group {
  category: string
  items: WatchItem[]
  watched: number
  total: number
}

/** Routines grouped by category, in the order the categories first appear. Counts ignore filters. */
export function groupByCategory(all: WatchItem[], shown: WatchItem[]): Group[] {
  const groups = new Map<string, Group>()
  for (const item of all) {
    const category = item.category || OWN_CATEGORY
    const group = groups.get(category) ?? { category, items: [], watched: 0, total: 0 }
    group.total += 1
    if (item.watched) group.watched += 1
    groups.set(category, group)
  }
  for (const item of shown) groups.get(item.category || OWN_CATEGORY)?.items.push(item)
  return [...groups.values()].filter((g) => g.items.length > 0)
}

/** Routines matching the filter and every word of the search (title, comic, category, notes). */
export function filterItems(items: WatchItem[], filter: WatchFilter, query: string): WatchItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return items.filter((i) => {
    if (filter === 'todo' && i.watched) return false
    if (filter === 'watched' && !i.watched) return false
    const text = `${i.title} ${i.comedian} ${i.category} ${i.description}`.toLowerCase()
    return words.every((w) => text.includes(w))
  })
}

/** Your own link if you saved one, otherwise a YouTube search for the routine. */
export const watchUrl = (item: Pick<WatchItem, 'url' | 'title' | 'comedian'>): string =>
  item.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.comedian} ${item.title} stand up`.trim())}`

export const nextPosition = (items: WatchItem[]): number => items.reduce((max, i) => Math.max(max, i.position), 0) + 1
