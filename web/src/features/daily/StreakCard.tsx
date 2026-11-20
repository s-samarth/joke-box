/**
 * One streak card: the name and your best streak on top, the current streak big, the last 14 days
 * as squares (filled on days that counted, today outlined until it does), and this month along the
 * bottom. The squares make the run and its gaps visible, like the mic diary.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Tone } from './streakTones'

/** One of the month's figures: a big number and its unit. `wide` ones only show from tablet width up. */
export interface MonthItem {
  value: ReactNode
  unit: string
  wide?: boolean
}

export interface StripDay {
  day: string
  on: boolean
}

interface Props {
  icon: ReactNode
  title: string
  current: number
  longest: number
  tone: Tone
  /** The last 14 days, oldest first; the last is today. */
  strip: StripDay[]
  /** What a filled square means, for its tooltip: "a joke", "a show". */
  counted: string
  /** This month: its name over its figures, or `empty` when there's nothing to count. */
  month: { name: string; items: MonthItem[]; empty?: string }
  to?: string
}

const short = (day: string) => new Date(`${day}T12:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })

function Strip({ strip, tone, counted }: Pick<Props, 'strip' | 'tone' | 'counted'>) {
  const days = strip.filter((d) => d.on).length
  return (
    <div className="mt-3">
      <div role="img" aria-label={`Last ${strip.length} days: ${counted} on ${days}`} className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-[2px] sm:gap-[3px]">
        {strip.map(({ day, on }, i) => {
          const today = i === strip.length - 1
          return <span key={day} title={`${short(day)}: ${on ? counted : 'none'}`}
            className={`aspect-square rounded-[2px] sm:rounded-[3px] ${on ? tone.fill : `bg-ink-3 ${today ? tone.today : ''}`}`} />
        })}
      </div>
      <p aria-hidden className="mt-1 flex justify-between text-[10px] text-faint sm:text-[11px]"><span>{short(strip[0].day)}</span><span>today</span></p>
    </div>
  )
}

export function StreakCard({ icon, title, current, longest, tone, strip, counted, month, to }: Props) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-xs text-dim sm:text-[13px]">
        {icon}<span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="shrink-0">Best <b className="text-sm font-semibold text-paper tabular sm:text-[15px]">{longest}</b></span>
      </p>
      <p className={`headline mt-2 text-[30px] leading-none tabular sm:text-[34px] ${tone.text}`}>
        {current} <span className="text-[15px] font-normal text-dim">{current === 1 ? 'day' : 'days'}</span>
      </p>
      <Strip strip={strip} tone={tone} counted={counted} />
      <div className="mt-2.5 border-t border-rule pt-2 text-xs text-dim sm:text-[13px]">
        <p>{month.name}</p>
        {month.items.length ? (
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-3 sm:gap-x-4">
            {month.items.map((m) => (
              <span key={m.unit} className={`whitespace-nowrap ${m.wide ? 'hidden sm:inline' : ''}`}>
                <b className="text-base font-semibold text-paper tabular sm:text-xl">{m.value}</b>{m.unit && ` ${m.unit}`}
              </span>
            ))}
          </p>
        ) : <p className="mt-0.5 text-paper">{month.empty}</p>}
      </div>
    </>
  )
  const cls = `block min-w-0 rounded-xl bg-ink-2 p-3 ring-1 sm:px-4 sm:py-3.5 ${tone.ring}`
  return to
    ? <Link to={to} aria-label={`${title}: ${current}, best ${longest}`} className={`${cls} transition hover:bg-ink-3 active:bg-ink-3`}>{body}</Link>
    : <section aria-label={title} className={cls}>{body}</section>
}
