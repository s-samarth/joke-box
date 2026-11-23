/**
 * A list whose filters live in the URL (?topic=&q=…) and are remembered for a while, so leaving
 * and coming back (another tab, an item opened from somewhere else) finds them as you left them.
 * The tab bar links to the bare list, so without this every visit started over.
 *
 * - Change a filter through `update` and it's remembered at once; clearing them all forgets them.
 * - Arrive with no filters in the URL and the remembered ones come back.
 * - `transient` names params that aren't filters, like ?new=1 for an open sheet: never remembered,
 *   and kept as they are when the filters come back.
 *
 * Used by Jokes, Premises and Observations. See sessionMemory for how long the memory lasts.
 */
import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { recall, remember } from './sessionMemory'

/** The filters in these params as a query string, leaving out the transient ones. */
export function filtersOf(params: URLSearchParams, transient: readonly string[] = []): string {
  const filters = new URLSearchParams(params)
  for (const name of transient) filters.delete(name)
  return filters.toString()
}

/** These params with the remembered filters put back in; the transient ones stay. */
export function withFilters(params: URLSearchParams, saved: string): URLSearchParams {
  const next = new URLSearchParams(saved)
  params.forEach((value, name) => {
    if (!next.has(name)) next.set(name, value)
  })
  return next
}

export function useRememberedParams(key: string, transient: readonly string[] = []) {
  const [params, setParams] = useSearchParams()

  const update = (change: (next: URLSearchParams) => void): void => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        change(next)
        remember(key, filtersOf(next, transient))
        return next
      },
      { replace: true },
    )
  }

  const filters = filtersOf(params, transient)
  useEffect(() => {
    if (filters) {
      remember(key, filters)
      return
    }
    const saved = recall<string>(key)
    if (saved) setParams((current) => withFilters(current, saved), { replace: true })
  }, [key, filters, setParams])

  return { params, update, filters }
}
