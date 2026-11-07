/**
 * Your observations on one topic, beside the premise or joke you're writing (Obsidian's sidebar,
 * Notion's side peek). Each one can go into the notes you're writing, or start a new joke. It
 * follows the open item's topic; the Topic menu looks at another without changing the item.
 *
 * Where it shows is ObservationsSide's job: a panel beside the item on a wide screen, a sheet on a
 * phone.
 */
import { Check, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useObservationKinds, useObservations } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { formatDate } from '../../lib/time'
import { TopicMenu } from './ObservationMenus'
import { kindLabel, matchesFilters, PLAIN } from './observationMeta'

export interface PanelActions {
  /** "Add to notes": what the button says and what it does. */
  addLabel: string
  /** Already in those notes: says so instead of offering to add it again. */
  addedLabel: string
  isAdded: (o: Observation) => boolean
  onAdd: (o: Observation) => void
  onWrite: (o: Observation) => void
}

const action = 'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-dim transition-colors hover:bg-ink-3 hover:text-paper'
const done = 'inline-flex h-8 items-center gap-1.5 px-2 text-sm text-faint'

export function ObservationsPanel({ topicId, addLabel, addedLabel, isAdded, onAdd, onWrite }: PanelActions & { topicId: string | null }) {
  const { data: observations = [] } = useObservations()
  const { data: kinds = [] } = useObservationKinds()
  const [topic, setTopic] = useState<string | null>(topicId)
  const shown = observations.filter((o) => matchesFilters(o, topic, null)).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const count = (value: string | null) => observations.filter((o) => matchesFilters(o, value, null)).length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-dim">
        <span className="shrink-0">On</span>
        <TopicMenu value={topic} onChange={setTopic} counts={count} />
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl bg-ink-2 px-4 py-5 text-[15px] leading-relaxed text-dim ring-1 ring-rule">
          Nothing noticed here yet. When something about it catches your eye, log it on <Link to="/observations" className="text-tape hover:underline">Observations</Link>.
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((o) => {
            const kind = kindLabel(kinds, o.kind_id)
            return (
              <li key={o.id} className="rounded-xl bg-ink-2 px-3.5 pt-3 pb-1.5 ring-1 ring-rule">
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{o.text}</p>
                <p className="mt-1 text-xs text-faint">{kind !== PLAIN && <span className="text-dim">{kind} · </span>}{formatDate(o.created_at)}</p>
                <div className="-mx-1 mt-1 flex flex-wrap gap-0.5">
                  {isAdded(o)
                    ? <span className={done}><Check size={15} className="text-tape" />{addedLabel}</span>
                    : <button type="button" onClick={() => onAdd(o)} className={action}><Plus size={15} />{addLabel}</button>}
                  <button type="button" onClick={() => onWrite(o)} className={action}><Sparkles size={15} />New joke</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Link to={`/observations${topic ? `?topic=${topic}` : ''}`} className="inline-flex h-10 items-center text-sm text-dim hover:text-paper">Open Observations</Link>
    </div>
  )
}
