/**
 * The jokes and observations linked to a session, as small cards you can open or unlink (with
 * Undo), and a search box to link more: the same box as everywhere else, jokes and observations
 * together. A link to something since deleted just isn't shown. "Turn into a joke" starts a new
 * joke from the session's first typed idea, with the session's observations linked to it, and
 * links the joke here as it's saved.
 */
import { Sparkles, X } from 'lucide-react'
import { Link } from 'react-router'
import { useJokes, useTopics } from '../../api/library'
import { useObservations } from '../../api/notebook'
import { useFeedback } from '../../components/ui/feedbackContext'
import { topicName } from '../../lib/jokeMeta'
import { useCapture } from '../capture/captureContext'
import { LinkSearch } from '../observations/LinkSearch'

interface Props {
  jokeIds: string[]
  observationIds: string[]
  onChange: (jokeIds: string[], observationIds: string[]) => void
  /** What a joke made from this session starts with. */
  idea: string
}

const card = 'group relative flex max-w-full items-start gap-2 rounded-lg bg-ink-2 py-2 pr-9 pl-3 ring-1 ring-rule sm:max-w-sm'

function Card({ to, kind, text, onUnlink }: { to: string; kind: string; text: string; onUnlink: () => void }) {
  return (
    <div className={card}>
      <Link to={to} className="min-w-0 text-sm hover:text-tape">
        <span className={`block text-xs ${kind === 'Joke' ? 'text-tape' : 'text-dim'}`}>{kind}</span>
        <span className="line-clamp-2">{text}</span>
      </Link>
      <button type="button" aria-label={`Unlink this ${kind.toLowerCase()}`} onClick={onUnlink} className="hit absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper">
        <X size={15} />
      </button>
    </div>
  )
}

export function SessionLinks({ jokeIds, observationIds, onChange, idea }: Props) {
  const { openCapture } = useCapture()
  const { toast } = useFeedback()
  const { data: jokes = [] } = useJokes()
  const { data: observations = [] } = useObservations()
  const { data: topics = [] } = useTopics()
  const topic = (id: string | null) => topicName(topics.find((t) => t.id === id))
  const linked = jokeIds.flatMap((id) => jokes.filter((b) => b.id === id))
  const notes = observationIds.flatMap((id) => observations.filter((o) => o.id === id))
  const unlink = (next: [string[], string[]], what: string) => {
    onChange(...next)
    toast(`${what} unlinked`, { label: 'Undo', onClick: () => onChange(jokeIds, observationIds) })
  }
  // One box for both, so ids say which list they belong to.
  const items = [
    ...observations.map((o) => ({ id: `o:${o.id}`, text: o.text, sub: `Observation · ${topic(o.topic_id)}`, linked: observationIds.includes(o.id) })),
    ...jokes.map((j) => ({ id: `j:${j.id}`, text: j.setup, sub: `Joke · ${topic(j.topic_id)}`, linked: jokeIds.includes(j.id) })),
  ]
  const pick = (id: string) => (id.startsWith('j:') ? onChange([...jokeIds, id.slice(2)], observationIds) : onChange(jokeIds, [...observationIds, id.slice(2)]))
  const unpick = (id: string) => (id.startsWith('j:')
    ? unlink([jokeIds.filter((x) => x !== id.slice(2)), observationIds], 'Joke')
    : unlink([jokeIds, observationIds.filter((x) => x !== id.slice(2))], 'Observation'))

  return (
    <div className="space-y-2">
      {(linked.length > 0 || notes.length > 0) && (
        <div className="flex flex-wrap items-start gap-2">
          {linked.map((b) => <Card key={b.id} to={`/jokes/${b.id}`} kind="Joke" text={b.setup} onUnlink={() => unlink([jokeIds.filter((x) => x !== b.id), observationIds], 'Joke')} />)}
          {notes.map((o) => <Card key={o.id} to={`/observations/${o.id}`} kind="Observation" text={o.text} onUnlink={() => unlink([jokeIds, observationIds.filter((x) => x !== o.id)], 'Observation')} />)}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1 basis-64"><LinkSearch placeholder="Link a joke or observation" items={items} onPick={pick} onUnpick={unpick} /></div>
        <button type="button" onClick={() => openCapture({ setup: idea, observationIds: notes.map((o) => o.id), onCreated: (id) => onChange([...jokeIds, id], observationIds) })}
          className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm text-tape ring-1 ring-rule ring-inset hover:bg-ink-3">
          <Sparkles size={16} /> Turn into a joke
        </button>
      </div>
    </div>
  )
}
