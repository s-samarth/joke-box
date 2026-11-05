/**
 * The jokes list. Sorted by a date (newest, oldest or recently edited), it's grouped into months
 * under pinned headings with a time scrubber; sorted by strength or length, it's one plain list.
 * Each row shows when the joke was added, or when it was last edited under "Recently edited".
 * With the screen to itself (`wide`), the rows go two across.
 */
import { Timer } from 'lucide-react'
import { Link } from 'react-router'
import type { Joke, Topic } from '../../api/types'
import { MonthSection } from '../../components/time/MonthSection'
import { TimeRail } from '../../components/time/TimeRail'
import { StrengthTicks, TypeLabel } from '../../components/ui/pieces'
import { topicName } from '../../lib/jokeMeta'
import { clock } from '../../lib/duration'
import { groupByMonth } from '../../lib/months'
import { formatDate } from '../../lib/time'
import { sortDate, type SortKey } from './useJokeFilters'

/** Phones: down the screen edge like the other lists. Desktop: down the right of the list column. */
const RAIL = 'fixed right-0.5 top-[calc(4.5rem+env(safe-area-inset-top))] bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:absolute lg:right-0 lg:top-0 lg:bottom-0'

function JokeRow({ joke, topic, active, query, edited, opening }: { joke: Joke; topic?: Topic; active: boolean; query: string; edited: boolean; opening: boolean }) {
  return (
    <li className="border-b border-rule">
      {/* Opening the first joke reshapes the screen, so that one fades; moving between jokes doesn't. */}
      <Link to={`/jokes/${joke.id}${query ? `?${query}` : ''}`} viewTransition={opening} aria-current={active ? 'page' : undefined}
        className={`block border-l-2 py-3.5 pr-2 pl-3 transition-colors ${active ? 'border-tape bg-ink-2' : 'border-transparent hover:bg-ink-2/60'}`}>
        <p className="line-clamp-2 leading-snug">{joke.setup}</p>
        {joke.punchline && <p className="mt-1 line-clamp-1 text-[15px] text-dim">{joke.punchline}</p>}
        <div className="mt-2 flex items-center gap-x-3 gap-y-1 text-[13px] text-faint">
          <StrengthTicks strength={joke.strength} />
          {joke.types.slice(0, 2).map((t) => <span key={t} className="shrink-0 whitespace-nowrap"><TypeLabel name={t} /></span>)}
          <span className="truncate">{topicName(topic)}</span>
          <span className="ml-auto shrink-0 tabular">{edited ? `Edited ${formatDate(joke.updated_at)}` : formatDate(joke.created_at)}</span>
          {joke.duration_seconds > 0 && <span className="flex shrink-0 items-center gap-1 tabular"><Timer size={12} aria-label="Runs" />{clock(joke.duration_seconds)}</span>}
        </div>
      </Link>
    </li>
  )
}

interface Props {
  jokes: Joke[]
  topics: Topic[]
  sort: SortKey
  activeId?: string
  query: string
  /** Classes that lay the rows out two across, when the list has the screen. */
  wide?: string
}

export function JokeList({ jokes, topics, sort, activeId, query, wide = '' }: Props) {
  const dateOf = sortDate(sort)
  const row = (b: Joke) => <JokeRow key={b.id} joke={b} topic={topics.find((t) => t.id === b.topic_id)} active={b.id === activeId} query={query} edited={sort === 'edited'} opening={!activeId} />
  if (!dateOf) return <ul className={`pb-6 ${wide}`}>{jokes.map(row)}</ul>
  const groups = groupByMonth(jokes, dateOf)
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
