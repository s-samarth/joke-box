/**
 * Big days (like Garmin's personal records): the biggest writing day, the most jokes in a day,
 * the longest night on stage, the best room by LPM and the longest joke streak, each beside a
 * small copy of its calendar day.
 */
import type { ReactNode } from 'react'
import { formatDate } from '../../../lib/time'
import { plural, stageTotal } from '../../shows/calendar/showMonth'
import { KIND_META } from '../activity'
import type { BigDays } from './highlightMath'

const date = (day: string) => formatDate(day.length === 10 ? `${day}T12:00:00+05:30` : day)
const dayNumber = (day: string) => Number(date(day).split(' ')[0])

function MiniDay({ day, dots }: { day: string; dots: string[] }) {
  return (
    <span aria-hidden className="relative size-10 shrink-0 rounded-lg bg-paper/20">
      <span className="absolute top-1 left-1.5 text-[11px] font-semibold tabular">{dayNumber(day)}</span>
      <span className="absolute inset-x-0 bottom-1.5 flex justify-center gap-0.5">{dots.map((d, i) => <span key={i} className={`size-[5px] rounded-full ${d}`} />)}</span>
    </span>
  )
}

function Row({ mark, big, what }: { mark: ReactNode; big: string; what: string }) {
  return (
    <li className="flex min-w-0 items-center gap-3 border-b border-rule py-2.5">
      {mark}
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{big}</p>
        <p className="truncate text-[13px] text-dim">{what}</p>
      </div>
    </li>
  )
}

export function BigDaysList({ days }: { days: BigDays }) {
  const { writing, jokes, stage, room, streak } = days
  if (!writing && !stage && !streak) return <p className="text-[15px] text-dim">Your biggest days show up here once you've written a few.</p>
  const short = (d: string) => date(d).split(' ').slice(0, 2).join(' ')
  return (
    <ul className="grid gap-x-6 @lg:grid-cols-2">
      {writing && <Row mark={<MiniDay day={writing.day} dots={writing.kinds.map((k) => KIND_META[k].dot)} />} big={plural(writing.total, 'piece')} what={`Your biggest writing day · ${date(writing.day)}`} />}
      {jokes && jokes.jokes > 1 && <Row mark={<MiniDay day={jokes.day} dots={[KIND_META.jokes.dot]} />} big={plural(jokes.jokes, 'joke')} what={`Most jokes in a day · ${date(jokes.day)}`} />}
      {stage && <Row mark={<MiniDay day={stage.day} dots={Array.from({ length: Math.min(stage.shows, 3) }, () => 'bg-tape')} />} big={`${plural(stage.shows, 'show')} · ${stageTotal(stage.seconds)}`} what={`Your longest night on stage · ${date(stage.day)}`} />}
      {room && <Row mark={<MiniDay day={room.day} dots={['bg-tape']} />} big={`${room.lpm.toFixed(1)} LPM`} what={`Your best room · ${room.venue || 'a show'} · ${date(room.day)}`} />}
      {streak && streak.length > 1 && (
        <Row mark={<span className="headline flex size-10 shrink-0 items-center justify-center text-[24px] text-ok tabular" aria-hidden>{streak.length}</span>}
          big={`${streak.length}-day joke streak`} what={`Your longest · ${short(streak.from)} to ${short(streak.to)}`} />
      )}
    </ul>
  )
}
