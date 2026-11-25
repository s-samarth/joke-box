/**
 * Pick jokes you've written, with the Jokes tab's own filter row (topic, subtopic, premise, type,
 * status, sort) and rows like its list. Filters start where the caller says (usually where the
 * joke on the page is filed); clear them to pick from any topic. Jokes that can't be picked
 * (`blockedBy` says why) sit greyed at the bottom. Used to add versions to a cluster, jokes to a
 * premise or an observation, and to link the joke before or after in a chain.
 */
import { Ban } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTopics } from '../../api/library'
import type { Joke } from '../../api/types'
import { StrengthTicks } from '../../components/ui/pieces'
import { clock } from '../../lib/duration'
import { statusOf, topicName } from '../../lib/jokeMeta'
import { JokeFilters } from '../jokes/JokeFilters'
import { JokeRowBody } from '../jokes/JokeRowBody'
import { linkStyle, PickSheet } from './PickSheet'
import { useJokePickFilters, type StartAt } from './useJokePickFilters'

interface Props {
  title: string
  description: string
  onClose: () => void
  candidates: Joke[]
  start: StartAt
  /** Why a joke can't be picked here, or null when it can. */
  blockedBy?: (j: Joke) => string | null
  blockedIcon?: ReactNode
  /** A detail worth knowing before picking one (where it moves from). */
  note?: (j: Joke) => string | null
  pinned?: ReactNode
  many?: [verb: string, one: string, more: string]
  current?: string | null
  onPick: (ids: string[]) => void
}

export function JokePickSheet({ candidates, start, blockedBy = () => null, blockedIcon = <Ban size={18} aria-hidden />, note = () => null, ...sheet }: Props) {
  const { data: topics = [] } = useTopics()
  const { f, shown: matching, discarded, showDiscarded } = useJokePickFilters(candidates, start)
  const shown = [...matching.filter((j) => !blockedBy(j)), ...matching.filter((j) => blockedBy(j))]
  const blocked = matching.length - matching.filter((j) => !blockedBy(j)).length
  // A topic picked goes without saying on each row; with all topics, each row says its own.
  const where = (j: Joke) => {
    const topic = topics.find((t) => t.id === j.topic_id)
    const sub = topic?.subtopics.find((s) => s.id === j.subtopic_id && !s.is_system)?.name
    return [f.topic ? null : topicName(topic), sub].filter(Boolean).join(' › ')
  }

  const status = (
    <>
      {`${shown.length} ${shown.length === 1 ? 'joke' : 'jokes'}`}{blocked > 0 && ` · ${blocked} can't be picked`}
      {discarded > 0 && <>{` · ${discarded} discarded ${showDiscarded ? 'shown' : 'hidden'} `}<button type="button" onClick={() => f.set({ discarded: showDiscarded ? null : 'show' })} className={linkStyle}>{showDiscarded ? 'Hide' : 'Show'}</button></>}
      {f.active && <> · <button type="button" onClick={() => f.set({ topic: null, sub: null, premise: null, type: null, status: null, persona: null, q: null })} className={linkStyle}>Clear filters</button></>}
    </>
  )
  const rows = shown.map((j) => {
    const why = blockedBy(j)
    const extra = why ?? note(j)
    return {
      id: j.id,
      blocked: Boolean(why),
      blockedIcon,
      body: (
        <JokeRowBody joke={j} punchClass="text-tape/90">
          {extra && <span className="rounded-md bg-ink-3 px-1.5 py-0.5 text-paper">{extra}</span>}
          {j.id === sheet.current && <span className="text-tape">Current</span>}
          <StrengthTicks strength={j.strength} />
          <span>{statusOf(j.status)}</span>
          {where(j) && <span className="truncate">{where(j)}</span>}
          {j.duration_seconds > 0 && <span className="tabular">{clock(j.duration_seconds)}</span>}
        </JokeRowBody>
      ),
    }
  })

  return <PickSheet {...sheet} filters={<JokeFilters f={f} edge="-mx-5 px-5" />} status={status} rows={rows} empty="No jokes match. Try another word, or Clear filters." />
}
