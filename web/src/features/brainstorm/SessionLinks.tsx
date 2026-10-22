/**
 * The jokes and observations linked to a session, as small cards you can open or unlink.
 * A link to something since deleted just isn't shown.
 */
import { Link2, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useJokes } from '../../api/library'
import { useObservations } from '../../api/notebook'
import { LinkPicker } from './LinkPicker'

interface Props {
  jokeIds: string[]
  observationIds: string[]
  onChange: (jokeIds: string[], observationIds: string[]) => void
}

const card = 'group relative flex max-w-full items-start gap-2 rounded-lg bg-ink-2 py-2 pr-9 pl-3 ring-1 ring-rule sm:max-w-sm'

function Unlink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Unlink" onClick={onClick} className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper">
      <X size={15} />
    </button>
  )
}

export function SessionLinks({ jokeIds, observationIds, onChange }: Props) {
  const [picking, setPicking] = useState(false)
  const { data: jokes = [] } = useJokes()
  const { data: observations = [] } = useObservations()
  const linked = jokeIds.flatMap((id) => jokes.filter((b) => b.id === id))
  const notes = observationIds.flatMap((id) => observations.filter((o) => o.id === id))

  return (
    <div className="flex flex-wrap items-start gap-2">
      {linked.map((b) => (
        <div key={b.id} className={card}>
          <Link to={`/jokes/${b.id}`} className="min-w-0 text-sm hover:text-tape">
            <span className="block text-xs text-tape">Joke</span>
            <span className="line-clamp-2">{b.setup}</span>
          </Link>
          <Unlink onClick={() => onChange(jokeIds.filter((x) => x !== b.id), observationIds)} />
        </div>
      ))}
      {notes.map((o) => (
        <div key={o.id} className={card}>
          <span className="min-w-0 text-sm">
            <span className="block text-xs text-dim">Observation</span>
            <span className="line-clamp-2">{o.text}</span>
          </span>
          <Unlink onClick={() => onChange(jokeIds, observationIds.filter((x) => x !== o.id))} />
        </div>
      ))}
      <button type="button" onClick={() => setPicking(true)} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-tape ring-1 ring-rule ring-inset hover:bg-ink-3">
        <Link2 size={16} /> Link jokes or observations
      </button>
      {picking && <LinkPicker jokeIds={jokeIds} observationIds={observationIds} onChange={onChange} onClose={() => setPicking(false)} />}
    </div>
  )
}
