/**
 * The year's writing cards: the best month (with every month as bars), the biggest day (with its
 * month as a calendar), the longest streak (one square a day), the top topics and when you write
 * (a punch card). Each fills its card with a chart, so nothing sits on an empty wall.
 */
import { plural } from '../../shows/calendar/showMonth'
import { KIND_META, KINDS } from '../activity'
import { monthWeeks } from '../dailyMath'
import { longMonth } from '../highlights/measures'
import { PARTS, WEEKDAYS } from '../pulseTrends'
import { Display, Eyebrow, Letterboard, MonthBars, StatBox, Underline } from './StoryKit'
import { dayMonth, n, PLURAL_PART } from './storyFormat'
import { tint, type Theme } from './themes'
import type { YearStats } from './yearStats'

/** A month's name, dressed for the theme: green poster letters, a black block or a letterboard. */
function MonthName({ t, month }: { t: Theme; month: string }) {
  const name = longMonth(month)
  if (t.key === 'marquee') return <div className="mt-2"><Letterboard lines={[name]} size={name.length > 7 ? 15 : 19} /></div>
  if (t.key === 'flyer') return <p className="mt-2 inline-block -rotate-2 self-start bg-current px-3 py-1 font-poster text-[34px]"><span className="text-[#efe9dc]">{name}</span></p>
  return <><p className="mt-2 -rotate-3 font-poster text-[40px] text-ok [text-shadow:3px_3px_0_#0b0d13]">{name}</p><Underline /></>
}

export function MonthCard({ t, s }: { t: Theme; s: YearStats }) {
  const best = s.best
  if (!best) return null
  return (
    <>
      <Eyebrow t={t}>{s.sofar ? 'Your best month so far' : 'Your best month'}</Eyebrow>
      <MonthName t={t} month={best.month} />
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <StatBox t={t} value={n(best.total)} label="pieces" />
        <StatBox t={t} value={best.jokes} label="jokes" />
        <StatBox t={t} value={`${best.daysWritten}/${best.days}`} label="days written" className={t.accent} />
      </div>
      <div className="mt-5 flex min-h-0 flex-1 flex-col"><MonthBars t={t} months={s.months} best={best.month} /></div>
    </>
  )
}

export function DayCard({ t, s }: { t: Theme; s: YearStats }) {
  const b = s.biggest
  if (!b) return null
  const max = Math.max(1, ...s.dayTotals.values())
  return (
    <>
      <Eyebrow t={t}>Your biggest day</Eyebrow>
      <Display t={t} className="text-[50px]">{dayMonth(b.day)}</Display>
      <p className={`mt-1 text-[15px] ${t.muted}`}>{plural(b.total, 'piece')} in one day</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {KINDS.map((k) => <StatBox key={k} t={t} value={b.counts[k]} label={KIND_META[k].many} />)}
      </div>
      <div className="mt-auto pt-4" aria-hidden>
        <p className="mb-1.5 text-[11px] font-bold uppercase">{longMonth(b.day.slice(0, 7))}</p>
        <div className="grid grid-cols-7 gap-1">
          {monthWeeks(b.day.slice(0, 7)).flat().map((d, i) => {
            const v = d ? (s.dayTotals.get(d) ?? 0) : 0
            return <span key={d ?? `x${i}`} className={`flex aspect-square items-center justify-center rounded text-[10px] font-semibold ${!d ? '' : d === b.day ? `${t.barTop} ring-2 ring-current` : v ? t.bar : 'border border-current/20'}`}
              style={d && d !== b.day && v ? { opacity: 0.4 + (v / max) * 0.6 } : undefined}>{d ? Number(d.slice(8)) : ''}</span>
          })}
        </div>
      </div>
    </>
  )
}

export function StreakCard({ t, s }: { t: Theme; s: YearStats }) {
  const run = s.streak
  if (!run || run.length < 2) return null
  return (
    <>
      <Eyebrow t={t}>Your longest joke streak</Eyebrow>
      <Display t={t} className={`text-[60px] ${tint(t, 'text-ok')}`}>{run.length}<span className="ml-2 text-[26px]">days</span></Display>
      <p className={`mt-2 text-[15px] ${t.muted}`}>A new joke every day, {dayMonth(run.from)} to {dayMonth(run.to)}.</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <StatBox t={t} value={s.jokeDays.size} label="days with a new joke" />
        <StatBox t={t} value={s.daysCounted} label={s.sofar ? 'days so far' : 'days in the year'} />
      </div>
      <JokeYear t={t} s={s} />
    </>
  )
}

/** The year as rows of days, a month to a row: joke days lit, the streak in the theme's colour. */
function JokeYear({ t, s }: { t: Theme; s: YearStats }) {
  const run = s.streak
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col justify-end gap-[3px]" aria-hidden>
      {s.months.filter((m) => m.days).map((m) => (
        <div key={m.month} className="flex max-h-6 min-h-2.5 flex-1 items-stretch gap-1.5">
          <span className="flex w-7 shrink-0 items-center text-[9px] font-bold uppercase opacity-70">{longMonth(m.month).slice(0, 3)}</span>
          <div className="grid flex-1 grid-cols-[repeat(31,minmax(0,1fr))] gap-[2px]">
            {Array.from({ length: m.days }, (_, i) => {
              const d = `${m.month}-${String(i + 1).padStart(2, '0')}`
              const inRun = run && d >= run.from && d <= run.to
              return <span key={d} className={`rounded-[2px] ${inRun ? t.barTop : s.jokeDays.has(d) ? (t.key === 'flyer' ? 'bg-current/55' : 'bg-ok/70') : 'bg-current/12'}`} />
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TopicCard({ t, s }: { t: Theme; s: YearStats }) {
  const [first] = s.topics
  if (!first) return null
  return (
    <>
      <Eyebrow t={t}>Your topic of {s.year}</Eyebrow>
      <Display t={t} className={`text-[46px] leading-[0.95] ${tint(t, 'text-sky')}`}>{first.name}</Display>
      <p className={`mt-2 text-[15px] ${t.muted}`}>{plural(first.count, 'piece')} filed under it.</p>
      <ul className="flex flex-1 flex-col justify-end gap-3.5 pt-4">
        {s.topics.map((x, i) => (
          <li key={x.name}>
            <p className="flex justify-between gap-2 font-poster text-[15px]"><span className="truncate">{i + 1}. {x.name}</span><span className="tabular">{x.count}</span></p>
            <span className={`mt-1.5 block h-4 rounded-full ${i === 0 ? t.barTop : t.bar}`} style={{ width: `${Math.max(6, (x.count / first.count) * 100)}%` }} />
          </li>
        ))}
      </ul>
    </>
  )
}

export function WhenCard({ t, s }: { t: Theme; s: YearStats }) {
  const r = s.rhythm
  if (!r) return null
  const max = Math.max(1, ...r.grid.flat())
  return (
    <>
      <Eyebrow t={t}>When you write</Eyebrow>
      <Display t={t} className="text-[42px] leading-[0.95]">{r.day.slice(0, -1)} {PLURAL_PART[r.part]}</Display>
      <p className={`mt-2 text-[15px] ${t.muted}`}>{r.count} of your {n(s.total)} pieces were written then.</p>
      <div className="mt-auto grid grid-cols-[2.5rem_repeat(4,minmax(0,1fr))] items-center gap-y-2 pt-4 text-[10px] font-bold uppercase" aria-hidden>
        <span />{PARTS.map((p) => <span key={p} className="text-center opacity-70">{p.slice(0, 3)}</span>)}
        {WEEKDAYS.map((d, row) => (
          <div key={d} className="contents">
            <span className="opacity-70">{d.slice(0, 3)}</span>
            {r.grid[row].map((v, c) => {
              const top = d === r.day && PARTS[c] === r.part
              const size = v ? 8 + (v / max) * 20 : 5
              return <span key={c} className="flex h-7 items-center justify-center"><span className={`rounded-full ${top ? t.barTop : v ? 'bg-current/60' : 'bg-current/15'}`} style={{ width: size, height: size }} /></span>
            })}
          </div>
        ))}
      </div>
    </>
  )
}
