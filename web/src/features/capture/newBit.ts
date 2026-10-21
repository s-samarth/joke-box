/** Saving a freshly captured joke: sensible defaults so capture needs only the words. */
import { useNavigate } from 'react-router'
import { newId } from '../../api/client'
import { useSaveBit, useTopics } from '../../api/library'
import type { BitInput } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'
import { isOnline } from '../../api/network'

/** Everything a new joke starts with. Filed under Thoughts unless you pick a topic. */
export const blankBit = (topicId = ''): BitInput => ({
  setup: '',
  punchline: '',
  topic_id: topicId,
  subtopic_id: null,
  types: [],
  status: 'Draft',
  strength: 3,
  duration_seconds: 0,
  hashtags: [],
  tag_lines: [],
  clean_rating: null,
  language: null,
  comments: '',
})

interface Options {
  /** Go to the joke's page after saving. */
  open?: boolean
  /** Runs once the server has the joke (e.g. to attach a brainstorm to it). */
  onSaved?: (id: string) => void
}

export function useCaptureBit() {
  const save = useSaveBit()
  const { data: topics = [] } = useTopics()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const thoughtsId = topics.find((t) => t.is_system)?.id

  /** Saves (works offline) and returns the new joke's id. */
  return (c: Partial<BitInput> & { setup: string }, { open = false, onSaved }: Options = {}): string | null => {
    const topicId = c.topic_id || thoughtsId
    if (!c.setup.trim() || !topicId) return null
    const id = newId()
    const input: BitInput = {
      ...blankBit(topicId),
      ...c,
      setup: c.setup.trim(),
      punchline: (c.punchline ?? '').trim(),
      topic_id: topicId,
    }
    // mutateAsync, not mutate's callbacks: those are skipped once the calling sheet has closed,
    // while this promise settles whenever the save does (even after an offline wait).
    save.mutateAsync({ id, input }).then(() => onSaved?.(id), (e: Error) => toast(`Not saved: ${e.message}`))
    if (open) navigate(`/bits/${id}`)
    else toast(isOnline() ? 'Joke saved' : 'Saved offline, will sync', { label: 'Open', onClick: () => navigate(`/bits/${id}`) })
    return id
  }
}
