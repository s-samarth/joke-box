/**
 * The library's view state lives in the URL (?topic=&subtopic=&type=&q=), so the back button,
 * refresh and shared links all keep your place. Filtering runs in the browser, so it works offline.
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useBits, useTopics } from '../../api/library'
import type { Bit } from '../../api/types'
import { UNDEFINED_TYPE } from '../../lib/bitMeta'

export const ALL = 'All'

export function matchesSearch(bit: Bit, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return [bit.setup, bit.punchline, ...bit.hashtags, ...bit.tag_lines].some((text) =>
    text.toLowerCase().includes(needle),
  )
}

export function matchesType(bit: Bit, type: string): boolean {
  if (type === ALL) return true
  if (type === UNDEFINED_TYPE) return bit.types.length === 0
  return bit.types.some((t) => t.toLowerCase() === type.toLowerCase())
}

export function useLibraryView() {
  const [params, setParams] = useSearchParams()
  const { data: bits = [], isPending } = useBits()
  const { data: topics = [] } = useTopics()
  const topicId = params.get('topic')
  const subtopicId = params.get('subtopic')
  const type = params.get('type') ?? ALL
  const q = params.get('q') ?? ''
  const topic = topics.find((t) => t.id === topicId)
  const subtopic = topic?.subtopics.find((s) => s.id === subtopicId)

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  // Bits in the current folder: these decide which type pills appear.
  const inFolder = useMemo(
    () =>
      bits.filter(
        (b) => (!topicId || b.topic_id === topicId) && (!subtopicId || b.subtopic_id === subtopicId),
      ),
    [bits, topicId, subtopicId],
  )
  const visible = useMemo(
    () => inFolder.filter((b) => matchesType(b, type) && matchesSearch(b, q)),
    [inFolder, type, q],
  )
  const folderTypes = useMemo(
    () => [...new Set(inFolder.flatMap((b) => b.types))].sort((a, b) => a.localeCompare(b)),
    [inFolder],
  )

  return {
    isPending,
    topic,
    subtopic,
    type,
    q,
    visible,
    folderTypes,
    topics,
    setType: (value: string) => update({ type: value === ALL ? null : value }),
    setQuery: (value: string) => update({ q: value || null }),
  }
}
