/** Form state for the bit editor, and conversion to what the API expects. */
import { useState } from 'react'
import type { Bit, BitInput, CleanRating } from '../../api/types'
import { clock, parse } from '../../lib/duration'

export interface Prefill {
  topicId?: string
  subtopicId?: string | null
}

export interface Draft {
  setup: string
  punchline: string
  topicId: string
  subtopicId: string | null
  types: string[]
  status: string | null
  strength: number
  duration: string
  hashtags: string[]
  tagLines: string[]
  cleanRating: CleanRating | null
  language: string
  comments: string
}

export function draftFrom(bit: Bit | undefined, prefill: Prefill, randomTopicId: string): Draft {
  if (bit) {
    return {
      setup: bit.setup,
      punchline: bit.punchline,
      topicId: bit.topic_id,
      subtopicId: bit.subtopic_id,
      types: bit.types,
      status: bit.status,
      strength: bit.strength,
      duration: bit.duration_seconds ? clock(bit.duration_seconds) : '',
      hashtags: bit.hashtags,
      tagLines: bit.tag_lines,
      cleanRating: bit.clean_rating,
      language: bit.language ?? '',
      comments: bit.comments,
    }
  }
  return {
    setup: '',
    punchline: '',
    topicId: prefill.topicId ?? randomTopicId,
    subtopicId: prefill.subtopicId ?? null,
    types: [],
    status: 'Work in Progress',
    strength: 3,
    duration: '',
    hashtags: [],
    tagLines: [],
    cleanRating: null,
    language: '',
    comments: '',
  }
}

/** Returns the API body, or an error message for the form. */
export function toInput(d: Draft): BitInput | string {
  if (!d.setup.trim()) return 'A setup is required.'
  const seconds = parse(d.duration)
  if (seconds === null) return 'Duration should look like 1:30 or 1m 30s.'
  return {
    setup: d.setup.trim(),
    punchline: d.punchline.trim(),
    topic_id: d.topicId,
    subtopic_id: d.subtopicId,
    types: d.types,
    status: d.status,
    strength: d.strength,
    duration_seconds: seconds,
    hashtags: d.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)),
    tag_lines: d.tagLines.map((t) => t.trim()).filter(Boolean),
    clean_rating: d.cleanRating,
    language: d.language.trim() || null,
    comments: d.comments.trim(),
  }
}

export function useDraft(initial: Draft) {
  const [draft, setDraft] = useState(initial)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  return { draft, set, reset: setDraft }
}
