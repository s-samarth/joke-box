/**
 * The year review's cards, in order, from a year's numbers. A card with nothing to say (no
 * shows, no streak) is left out. Each card has a tone: ink, raised ink, or tape for the stage.
 */
import type { ReactNode } from 'react'
import { plural, stageTotal } from '../../shows/calendar/showMonth'
import { KIND_META, KINDS } from '../activity'
import { longMonth } from '../highlights/measures'
import { BestMonth, Cover, Lead } from './StoryParts'
import { dayMonth, minSec, n, PLURAL_PART } from './storyFormat'
import type { YearStats } from './yearStats'

export type Tone = 'ink' | 'raised' | 'tape'

export interface Story {
  key: string
  tone: Tone
  body: ReactNode
}

export function storiesFor(s: YearStats): Story[] {
  const all: (Story | false)[] = [
    { key: 'cover', tone: 'ink', body: <Cover s={s} /> },
    Boolean(s.best) && { key: 'month', tone: 'raised', body: <BestMonth s={s} /> },
    Boolean(s.biggest) && { key: 'day', tone: 'ink', body: s.biggest && (
      <div className="my-auto pb-10"><Lead over="Your biggest day" big={dayMonth(s.biggest.day)}>
        {plural(s.biggest.total, 'piece')} in one day: {KINDS.filter((k) => s.biggest?.counts[k]).map((k) => `${s.biggest?.counts[k]} ${s.biggest?.counts[k] === 1 ? KIND_META[k].one : KIND_META[k].many}`).join(', ')}.
      </Lead></div>
    ) },
    Boolean(s.streak && s.streak.length > 1) && { key: 'streak', tone: 'raised', body: s.streak && (
      <div className="my-auto pb-10"><Lead over="Your longest joke streak" big={plural(s.streak.length, 'day')} className="text-ok">A new joke every day, {dayMonth(s.streak.from)} to {dayMonth(s.streak.to)}.</Lead></div>
    ) },
    Boolean(s.topTopic) && { key: 'topic', tone: 'ink', body: s.topTopic && (
      <div className="my-auto pb-10"><Lead over={`Your topic of ${s.year}`} big={s.topTopic.name} className="text-sky">{plural(s.topTopic.count, 'piece')} filed under it.</Lead></div>
    ) },
    Boolean(s.rhythm) && { key: 'when', tone: 'raised', body: s.rhythm && (
      <div className="my-auto pb-10"><Lead over="When you write" big={`${s.rhythm.day.slice(0, -1)} ${PLURAL_PART[s.rhythm.part]}`}>{s.rhythm.count} of your {n(s.total)} pieces were written then.</Lead></div>
    ) },
    Boolean(s.stage) && { key: 'stage', tone: 'tape', body: s.stage && (
      <>
        <Lead over={s.sofar ? 'On stage so far' : 'On stage'} big={stageTotal(s.stage.seconds)}>{plural(s.stage.shows, 'show')} on {plural(s.stage.nights, 'night')}.</Lead>
        <dl className="mt-auto space-y-1 border-t border-tape-ink/25 pt-3 text-sm">
          {s.stage.room && <div className="flex justify-between gap-3"><dt className="opacity-75">Best room</dt><dd className="font-semibold">{s.stage.room.lpm.toFixed(1)} LPM</dd></div>}
          {s.stage.busiest && <div className="flex justify-between gap-3"><dt className="opacity-75">Busiest month</dt><dd className="font-semibold">{longMonth(s.stage.busiest.month)}, {s.stage.busiest.shows}</dd></div>}
          <div className="flex justify-between gap-3"><dt className="opacity-75">Longest set</dt><dd className="font-semibold tabular">{minSec(s.stage.longest)}</dd></div>
        </dl>
      </>
    ) },
    { key: 'through', tone: 'ink', body: (
      <>
        <Lead over="From notebook to stage" big={plural(s.through.ready, 'joke')} className="text-ok">marked Stage Ready, of {s.through.jokes} written this year.</Lead>
        <ul className="mt-6 space-y-2 text-[15px]">
          <li><b className="text-orchid tabular">{s.through.led}</b> of {s.through.observations} observations led somewhere</li>
          <li><b className="text-sky tabular">{s.through.built}</b> of {s.through.premises} premises got a joke</li>
        </ul>
        <p className="mt-auto text-sm opacity-75">{s.sofar ? `${s.daysIn - s.daysCounted} days of ${s.year} to go.` : `That was ${s.year}. See you on stage.`}</p>
      </>
    ) },
  ]
  return all.filter((x): x is Story => Boolean(x))
}
