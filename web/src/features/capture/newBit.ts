/** Saving a freshly captured bit: sensible defaults so capture needs only the words. */
import { useNavigate } from 'react-router'
import { newId } from '../../api/client'
import { useSaveBit, useTopics } from '../../api/library'
import type { BitInput } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'

export interface Captured {
  setup: string
  punchline?: string
  topicId?: string
  subtopicId?: string | null
  types?: string[]
}

export function useCaptureBit() {
  const save = useSaveBit()
  const { data: topics = [] } = useTopics()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const inboxId = topics.find((t) => t.is_system)?.id

  /** Saves (works offline) and returns the new bit's id. */
  return (c: Captured, { open = false } = {}): string | null => {
    const topicId = c.topicId ?? inboxId
    if (!c.setup.trim() || !topicId) return null
    const id = newId()
    const input: BitInput = {
      setup: c.setup.trim(),
      punchline: (c.punchline ?? '').trim(),
      topic_id: topicId,
      subtopic_id: c.subtopicId ?? null,
      types: c.types ?? [],
      status: 'Draft',
      strength: 3,
      duration_seconds: 0,
      hashtags: [],
      tag_lines: [],
      clean_rating: null,
      language: null,
      comments: '',
    }
    save.mutate({ id, input }, { onError: (e) => toast(`Not saved: ${e.message}`) })
    if (open) navigate(`/bits/${id}`)
    else toast(navigator.onLine ? 'Joke saved' : 'Saved offline, will sync', { label: 'Open', onClick: () => navigate(`/bits/${id}`) })
    return id
  }
}
