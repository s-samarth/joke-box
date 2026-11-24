/**
 * "Follows": the joke this one continues from, and "Followed by": the jokes that continue from it.
 * Many jokes can follow the same one, so a chain branches into a tree. Both pick from the joke
 * sheet (the Jokes tab's filters), starting on this joke's topic and subtopic, where the next
 * bit usually is; clear the filters to link a joke from any topic.
 */
import { Link2, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useJokes, useSaveJoke } from '../../api/library'
import type { Joke } from '../../api/types'
import { chainTo, laterThan } from '../../lib/chains'
import { JokePickSheet } from '../pickers/JokePickSheet'
import { toInput } from './useAutosaveJoke'

const chip = 'inline-flex h-10 items-center gap-2 rounded-lg bg-ink-3 px-3 text-[15px] hover:bg-ink-4'

interface Where {
  topicId: string
  subtopicId: string | null
}

interface Props extends Where {
  /** The joke being edited; none while writing a new one. */
  jokeId?: string
  value: string | null
  onChange: (id: string | null) => void
}

export function FollowsField({ jokeId, topicId, subtopicId, value, onChange }: Props) {
  const { data: jokes = [] } = useJokes()
  const [picking, setPicking] = useState(false)
  const before = jokes.find((b) => b.id === value)
  // A joke can't follow itself or anything that already comes after it.
  const later = jokeId ? laterThan(jokeId, jokes) : new Set<string>()

  return (
    <>
      {value ? (
        <div className="space-y-2">
          {before
            ? <Link to={`/jokes/${before.id}`} className="line-clamp-2 rounded-lg bg-ink-3 px-3 py-2.5 leading-snug hover:bg-ink-4">{before.setup}</Link>
            : <p className="text-dim">A joke in the Trash</p>}
          <div className="flex gap-5 text-sm">
            <button type="button" onClick={() => setPicking(true)} className="text-tape hover:underline">Change</button>
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-dim hover:text-paper"><X size={14} /> Unlink</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)} className={`${chip} text-dim hover:text-paper`}><Link2 size={16} /> Pick the joke before</button>
      )}
      {picking && (
        <JokePickSheet title="Which joke comes before?" description="This one will follow it. Adding this joke to a set brings the jokes before it too." onClose={() => setPicking(false)}
          candidates={jokes.filter((b) => !later.has(b.id))} start={{ topic: topicId, sub: subtopicId }} current={value}
          onPick={([id]) => { onChange(id); setPicking(false) }} />
      )}
    </>
  )
}

interface FollowedByProps extends Where {
  jokeId: string
  next: Joke[]
  onWriteNext: () => void
}

/** The jokes that follow this one, as links; pick ones you've written, or write another. */
export function FollowedBy({ jokeId, topicId, subtopicId, next, onWriteNext }: FollowedByProps) {
  const { data: jokes = [] } = useJokes()
  const save = useSaveJoke()
  const [picking, setPicking] = useState(false)
  const byId = new Map(jokes.map((j) => [j.id, j]))
  const self = byId.get(jokeId)
  // Not this joke, nor any joke before it (that would loop), nor one already following it.
  const earlier = new Set(self ? chainTo(self, byId).map((j) => j.id) : [jokeId])
  const candidates = jokes.filter((j) => !earlier.has(j.id) && j.follows_id !== jokeId)
  const setupOf = (id: string) => byId.get(id)?.setup ?? 'a joke in the Trash'
  const follow = (ids: string[]) => {
    for (const j of jokes) if (ids.includes(j.id)) save.mutate({ id: j.id, input: { ...toInput(j), follows_id: jokeId } })
  }

  return (
    <div className="space-y-2">
      {next.length > 0 && (
        <ul className="space-y-2">
          {next.map((b) => (
            <li key={b.id}><Link to={`/jokes/${b.id}`} className="line-clamp-2 rounded-lg bg-ink-3 px-3 py-2.5 leading-snug hover:bg-ink-4">{b.setup}</Link></li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onWriteNext} className={`${chip} text-dim hover:text-paper`}><Plus size={16} /> Write the next joke</button>
        <button type="button" onClick={() => setPicking(true)} className={`${chip} text-dim hover:text-paper`}><Link2 size={16} /> Pick jokes that follow</button>
      </div>
      {picking && (
        <JokePickSheet title="Which jokes come next?" description="Each one will follow this joke. Tap to pick." onClose={() => setPicking(false)}
          candidates={candidates} start={{ topic: topicId, sub: subtopicId }} many={['Link', 'joke', 'jokes']} onPick={follow}
          note={(j) => (j.follows_id ? `Now follows: ${setupOf(j.follows_id).slice(0, 40)}` : null)} />
      )}
    </div>
  )
}
