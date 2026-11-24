/**
 * The jokes list. Sorted by a date (newest, oldest or recently edited), it's grouped into months
 * under pinned headings with a time scrubber; sorted by strength or length, it's one plain list.
 * Each row shows when the joke was added, or when it was last edited under "Recently edited".
 * With the screen to itself (`wide`), the rows go two across. A cluster is one row showing one
 * version, with a badge saying how many it has (cluster/stacks.ts); tapping it opens the cluster.
 */
import { Layers, Timer } from 'lucide-react'
import { Link } from 'react-router'
import type { Topic } from '../../api/types'
import { MonthSection } from '../../components/time/MonthSection'
import { TimeRail } from '../../components/time/TimeRail'
import { StrengthTicks, TypeLabel } from '../../components/ui/pieces'
import { topicName } from '../../lib/jokeMeta'
import { clock } from '../../lib/duration'
import { groupByMonth } from '../../lib/months'
import { formatDate } from '../../lib/time'
import { badge, type ListRow } from './cluster/stacks'
import { JokeRowBody } from './JokeRowBody'
import { sortDate, type SortKey } from './useJokeFilters'

/** Phones: down the screen edge like the other lists. Desktop: down the right of the list column. */
const RAIL = 'fixed right-0.5 top-[calc(4.5rem+env(safe-area-inset-top))] bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:absolute lg:right-0 lg:top-0 lg:bottom-0'

/** A stacked row's badge: how many versions, in tape yellow so a cluster reads apart from a joke. */
function VersionsBadge({ row, flat }: { row: ListRow; flat: boolean }) {
  return (
    <span className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 whitespace-nowrap ${row.discarded ? 'bg-ink-3 text-faint' : 'bg-tape/15 text-tape'}`}>
      <Layers size={12} aria-hidden />{badge(row, flat)}{row.discarded ? ', discarded' : ''}
    </span>
  )
}

interface RowProps { row: ListRow; topic?: Topic; active: boolean; query: string; edited: boolean; opening: boolean; flat: boolean }

function JokeRow({ row, topic, active, query, edited, opening, flat }: RowProps) {
  const { joke } = row
  const stacked = Boolean(row.clusterId) && !flat
  const to = stacked ? `/jokes/c/${row.clusterId}` : `/jokes/${joke.id}`
  return (
    <li className="border-b border-rule">
      {/* Opening the first joke reshapes the screen, so that one fades; moving between jokes doesn't. */}
      <Link to={`${to}${query ? `?${query}` : ''}`} viewTransition={opening} aria-current={active ? 'page' : undefined}
        className={`block border-l-2 py-3.5 pr-2 pl-3 transition-colors ${active ? 'border-tape bg-ink-2' : 'border-transparent hover:bg-ink-2/60'}`}>
        <JokeRowBody joke={joke}>
          {row.clusterId && <VersionsBadge row={row} flat={flat} />}
          <StrengthTicks strength={joke.strength} />
          {joke.types.slice(0, 2).map((t) => <span key={t} className="shrink-0 whitespace-nowrap"><TypeLabel name={t} /></span>)}
          <span className="truncate">{topicName(topic)}</span>
          <span className="ml-auto shrink-0 tabular">{edited ? `Edited ${formatDate(joke.updated_at)}` : formatDate(joke.created_at)}</span>
          {joke.duration_seconds > 0 && <span className="flex shrink-0 items-center gap-1 tabular"><Timer size={12} aria-label="Runs" />{clock(joke.duration_seconds)}</span>}
        </JokeRowBody>
      </Link>
    </li>
  )
}

interface Props {
  rows: ListRow[]
  topics: Topic[]
  sort: SortKey
  /** The open joke, or the open cluster. */
  activeId?: string
  /** Every version on its own row, instead of one row per cluster. */
  flat: boolean
  query: string
  /** Classes that lay the rows out two across, when the list has the screen. */
  wide?: string
}

export function JokeList({ rows, topics, sort, activeId, flat, query, wide = '' }: Props) {
  const dateOf = sortDate(sort)
  const row = (r: ListRow) => {
    const active = r.joke.id === activeId || (!flat && Boolean(r.clusterId) && r.clusterId === activeId)
    return <JokeRow key={r.joke.id} row={r} topic={topics.find((t) => t.id === r.joke.topic_id)} active={active} query={query} edited={sort === 'edited'} opening={!activeId} flat={flat} />
  }
  if (!dateOf) return <ul className={`pb-6 ${wide}`}>{rows.map(row)}</ul>
  const groups = groupByMonth(rows, (r: ListRow) => dateOf(r.joke))
  return (
    <>
      <div className="pr-5 pb-6 lg:pr-6">
        {groups.map((g) => (
          <MonthSection key={g.key} inBox scope="jokes" monthKey={g.key} label={g.label} count={g.items.length}>
            <ul className={wide}>{g.items.map(row)}</ul>
          </MonthSection>
        ))}
      </div>
      <TimeRail scope="jokes" months={groups} className={RAIL} />
    </>
  )
}
