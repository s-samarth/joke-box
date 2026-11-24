/**
 * Pieces of the premises list: the count line under the filters (with Show / Hide for discarded
 * premises, like Jokes' JokeCount) and one row (its body is shared with the premise picker).
 */
import { Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Premise } from '../../api/premises'
import type { Topic } from '../../api/types'
import { StrengthTicks } from '../../components/ui/pieces'
import { topicName } from '../../lib/jokeMeta'
import { NO_PREMISE, premiseSize } from '../../lib/premises'
import { count } from '../../lib/topics'
import { PremiseStatusTag } from './PremiseStatusPicker'
import type { usePremiseFilters } from './usePremiseFilters'

export function PremiseCount({ f }: { f: ReturnType<typeof usePremiseFilters> }) {
  const total = count(f.total, 'premise', 'premises')
  return (
    <p className="mt-4 mb-1 text-sm text-faint">
      {f.active || f.hidingDiscarded ? `${f.visible.length} of ${total}` : total}
      {f.discarded > 0 && (
        <>
          {` · ${f.discarded} discarded ${f.showDiscarded ? 'shown' : 'hidden'} `}
          <button type="button" onClick={() => f.set({ discarded: f.showDiscarded ? null : 'show' })}
            className="-my-2 px-1 py-2 font-medium text-dim underline-offset-4 hover:text-paper hover:underline">
            {f.showDiscarded ? 'Hide' : 'Show'}
          </button>
        </>
      )}
      {f.loose > 0 && <> · <Link to={`/jokes?premise=${NO_PREMISE}`} className="text-tape hover:underline">{f.loose} {f.loose === 1 ? 'joke' : 'jokes'} on none yet</Link></>}
    </p>
  )
}

interface RowProps {
  premise: Premise
  jokes: number
  topics: Topic[]
  /** Under a By topic heading, the topic goes without saying. */
  showTopic: boolean
  search: string
  openId?: string
}

export function PremiseRow({ premise: p, jokes, topics, showTopic, search, openId }: RowProps) {
  const open = p.id === openId
  return (
    // Opening the first premise reshapes the screen, so that one fades; moving between premises doesn't.
    <Link to={`/premises/${p.id}${search}`} viewTransition={!openId} aria-current={open ? 'page' : undefined}
      className={`flex items-start gap-3 rounded-lg px-3 py-3 ${open ? 'bg-ink-3' : 'hover:bg-ink-2'}`}>
      <PremiseRowBody premise={p} jokes={jokes} topics={topics} showTopic={showTopic} />
    </Link>
  )
}

/** What a premise row shows, in the list and in the premise picker: the take, then its size, topic, strength and status. */
export function PremiseRowBody({ premise: p, jokes, topics, showTopic, children }: Omit<RowProps, 'search' | 'openId'> & { children?: ReactNode }) {
  return (
    <>
      <Lightbulb size={16} className={`mt-1 shrink-0 ${jokes >= 3 ? 'text-tape' : 'text-faint'}`} aria-hidden />
      <span className="min-w-0 flex-1 leading-snug">
        <span className="line-clamp-2">{p.take}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
          {children}
          <span>{premiseSize(jokes)}{showTopic && ` · ${topicName(topics.find((t) => t.id === p.topic_id))}`}</span>
          <StrengthTicks strength={p.strength} />
          <PremiseStatusTag status={p.status} />
        </span>
      </span>
    </>
  )
}
