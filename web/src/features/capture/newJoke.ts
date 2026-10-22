/** Saving a freshly captured joke: sensible defaults so capture needs only the words. */
import { useNavigate } from 'react-router'
import { newId } from '../../api/client'
import { useSaveJoke, useTopics } from '../../api/library'
import type { JokeInput } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'
import { announceSave } from '../../lib/announce'
import { DEFAULT_RUNTIME } from '../../lib/duration'

/**
 * Everything a new joke starts with: Thoughts (unless you pick a topic), Incomplete, 15 seconds,
 * clean and in Hinglish.
 */
export const blankJoke = (topicId = ''): JokeInput => ({
  setup: '',
  punchline: '',
  topic_id: topicId,
  subtopic_id: null,
  types: [],
  status: 'Incomplete',
  strength: 3,
  duration_seconds: DEFAULT_RUNTIME,
  hashtags: [],
  tag_lines: [],
  clean_rating: 'clean',
  language: 'Hinglish',
  comments: '',
  follows_id: null,
})

interface Options {
  /** Go to the joke's page after saving. */
  open?: boolean
  /** Runs once the server has the joke (e.g. to attach a brainstorm to it). */
  onSaved?: (id: string) => void
}

export function useCaptureJoke() {
  const save = useSaveJoke()
  const { data: topics = [] } = useTopics()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const thoughtsId = topics.find((t) => t.is_system)?.id

  /** Saves (works offline) and returns the new joke's id. */
  return (c: Partial<JokeInput> & { setup: string }, { open = false, onSaved }: Options = {}): string | null => {
    const topicId = c.topic_id || thoughtsId
    if (!c.setup.trim() || !topicId) return null
    const id = newId()
    const input: JokeInput = {
      ...blankJoke(topicId),
      ...c,
      setup: c.setup.trim(),
      punchline: (c.punchline ?? '').trim(),
      topic_id: topicId,
      created_at: c.created_at ?? new Date().toISOString(), // kept even if it only syncs tomorrow
    }
    // mutateAsync, not mutate's callbacks: those are skipped once the calling sheet has closed,
    // while this promise settles whenever the save does (even after an offline wait).
    const saving = save.mutateAsync({ id, input })
    saving.then(() => onSaved?.(id), (e: Error) => toast(`Not saved: ${e.message}`))
    if (open) navigate(`/jokes/${id}`)
    else announceSave(saving, toast, 'Joke saved', { label: 'Open', onClick: () => navigate(`/jokes/${id}`) })
    return id
  }
}
