/**
 * Word search over plain text: every word of the query must appear somewhere in the item, in
 * any order, ignoring case. `#tag` and `tag` both find a hashtag, however it was saved.
 */

/** The query's words, lowercased. An empty query has none. */
export const searchWords = (query: string): string[] => query.toLowerCase().split(/\s+/).filter(Boolean)

/** One lowercased block to search: the texts, and each hashtag with its # and without. */
export function haystack(texts: (string | null | undefined)[], hashtags: string[] = []): string {
  const tags = hashtags.flatMap((t) => {
    const bare = t.replace(/^#/, '')
    return [bare, `#${bare}`]
  })
  return [...texts, ...tags].filter(Boolean).join('\n').toLowerCase()
}

/** Does the block hold every word? No words matches everything. */
export const hasAll = (hay: string, words: string[]): boolean => words.every((w) => hay.includes(w))

/** Does any of these texts (and hashtags) hold every word of the query? */
export const matchesWords = (query: string, texts: (string | null | undefined)[], hashtags?: string[]): boolean =>
  hasAll(haystack(texts, hashtags), searchWords(query))

/** A short piece of `text` around the first word found, for a result line. */
export function snippet(text: string, words: string[], width = 110): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= width) return flat
  const lower = flat.toLowerCase()
  const at = words.map((w) => lower.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0
  const start = Math.max(0, Math.min(at - Math.floor(width / 3), flat.length - width))
  return `${start > 0 ? '…' : ''}${flat.slice(start, start + width).trim()}${start + width < flat.length ? '…' : ''}`
}
