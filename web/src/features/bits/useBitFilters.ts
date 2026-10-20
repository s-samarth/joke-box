/**
 * Bits list state lives in the URL (?topic=&sub=&type=&status=&q=&sort=), so back, refresh and
 * links keep your place. Filtering runs in the browser, so it works offline.
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useBits } from '../../api/library'
import type { Bit } from '../../api/types'
import { UNDEFINED_TYPE } from '../../lib/bitMeta'

export type SortKey = 'new' | 'strong' | 'weak' | 'long'

export const SORTS: Record<SortKey, string> = {
  new: 'Newest',
  strong: 'Strongest',
  weak: 'Weakest',
  long: 'Longest',
}

export function matchesSearch(bit: Bit, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return [bit.setup, bit.punchline, bit.comments, ...bit.hashtags, ...bit.tag_lines].some((t) => t.toLowerCase().includes(needle))
}

export function matchesType(bit: Bit, type: string | null): boolean {
  if (!type) return true
  if (type === UNDEFINED_TYPE) return bit.types.length === 0
  return bit.types.some((t) => t.toLowerCase() === type.toLowerCase())
}

const SORTERS: Record<SortKey, (a: Bit, b: Bit) => number> = {
  new: (a, b) => b.created_at.localeCompare(a.created_at),
  strong: (a, b) => b.strength - a.strength || b.created_at.localeCompare(a.created_at),
  weak: (a, b) => a.strength - b.strength || b.created_at.localeCompare(a.created_at),
  long: (a, b) => b.duration_seconds - a.duration_seconds,
}

export function useBitFilters() {
  const [params, setParams] = useSearchParams()
  const { data: bits = [], isPending } = useBits()
  const f = {
    topic: params.get('topic'),
    sub: params.get('sub'),
    type: params.get('type'),
    status: params.get('status'),
    q: params.get('q') ?? '',
    sort: (params.get('sort') as SortKey | null) ?? 'new',
  }

  const set = (changes: Partial<Record<'topic' | 'sub' | 'type' | 'status' | 'q' | 'sort', string | null>>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const visible = useMemo(
    () =>
      bits
        .filter(
          (b) =>
            (!f.topic || b.topic_id === f.topic) &&
            (!f.sub || b.subtopic_id === f.sub) &&
            matchesType(b, f.type) &&
            (!f.status || b.status === f.status) &&
            matchesSearch(b, f.q),
        )
        .sort(SORTERS[f.sort] ?? SORTERS.new),
    [bits, f.topic, f.sub, f.type, f.status, f.q, f.sort],
  )

  const active = Boolean(f.topic || f.type || f.status || f.q)
  return { ...f, set, visible, total: bits.length, isPending, active, query: params.toString() }
}
