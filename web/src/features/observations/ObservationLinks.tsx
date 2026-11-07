/**
 * Where an idea came from and where it went. A premise or joke shows the observations it came
 * from (CameFrom); an observation shows the premises and jokes that came from it (MadeInto).
 * The app makes these links when an observation is added to notes or starts a joke or premise.
 * Something in the Trash simply isn't shown.
 */
import { ArrowRight, X } from 'lucide-react'
import { Link } from 'react-router'
import { useJokes } from '../../api/library'
import { useLinkObservation, useObservations } from '../../api/notebook'
import { usePremises } from '../../api/premises'
import type { Observation } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { observationHref } from './useUsed'

type Kind = 'premises' | 'jokes'

const column = (kind: Kind) => (kind === 'premises' ? 'premise_ids' : 'joke_ids')
const short = (text: string, most = 60) => (text.length > most ? `${text.slice(0, most - 1).trimEnd()}…` : text)

/** On a premise or joke: the observations it came from, each one a tap away, or unlinked with ×. */
export function CameFrom({ kind, id }: { kind: Kind; id: string }) {
  const { data: observations = [] } = useObservations()
  const link = useLinkObservation()
  const from = observations.filter((o) => o[column(kind)]?.includes(id))
  if (from.length === 0) return null
  return (
    <section aria-label="Came from" className="mt-6">
      <h3 className="text-sm text-dim">Came from</h3>
      <ul className="mt-2 space-y-1.5">
        {from.map((o) => (
          <li key={o.id} className="flex items-start gap-1 border-l-2 border-tape/50 pl-3">
            <Link to={observationHref(o)} className="min-w-0 flex-1 py-1 text-[15px] leading-relaxed text-paper/85 hover:text-paper">
              <span className="line-clamp-3">{o.text}</span>
            </Link>
            <IconButton label="Unlink this observation" onClick={() => link.mutate({ id: o.id, kind, targetId: id, on: false })}><X size={15} /></IconButton>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Under an observation: the premises and jokes that came from it. Nothing yet: nothing shown. */
export function MadeInto({ observation }: { observation: Observation }) {
  const { data: premises = [] } = usePremises()
  const { data: jokes = [] } = useJokes()
  const made = [
    ...premises.filter((p) => observation.premise_ids?.includes(p.id)).map((p) => ({ key: p.id, to: `/premises/${p.id}`, label: `Premise: ${short(p.take)}` })),
    ...jokes.filter((j) => observation.joke_ids?.includes(j.id)).map((j) => ({ key: j.id, to: `/jokes/${j.id}`, label: `Joke: ${short(j.setup)}` })),
  ]
  if (made.length === 0) return null
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
      <ArrowRight size={14} className="text-faint" aria-label="Came from it:" />
      {made.map((m) => (
        <Link key={m.key} to={m.to} className="rounded-md bg-ink-3 px-2 py-0.5 text-dim transition-colors hover:text-paper">{m.label}</Link>
      ))}
    </p>
  )
}
