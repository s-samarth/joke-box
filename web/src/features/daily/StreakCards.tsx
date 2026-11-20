/**
 * Two matching cards at the top of daily activity (Home and Daily activity): writing in green,
 * the stage in gold. Each leads with its current streak, the longest under it, and this month
 * along the bottom. The stage card opens Shows. There's no stage nudge: the streak just says how
 * it stands.
 */
import { ChevronRight, Mic, PenLine } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useLogs } from '../../api/shows'
import { monthStats, plural, stageStreak, stageTotal } from '../shows/calendar/showMonth'
import { showsByDay } from '../shows/insights/timelineMath'
import { monthName, type MonthSummary } from './activity'
import type { Habit } from './dailyMath'

interface CardProps {
  icon: ReactNode
  title: string
  current: number
  longest: number
  /** Tailwind classes for the streak number and the card's ring, in the card's colour. */
  tone: string
  ring: string
  /** This month, short for a phone and long from tablet width up. */
  month: { short: ReactNode; long: ReactNode }
  to?: string
}

function StreakCard({ icon, title, current, longest, tone, ring, month, to }: CardProps) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-xs text-dim sm:text-[13px]">
        {icon}<span className="min-w-0 flex-1 truncate">{title}</span>
        {to && <ChevronRight size={14} className="shrink-0" />}
      </p>
      <p className={`headline mt-2 text-[30px] leading-none tabular sm:text-[34px] ${tone}`}>
        {current} <span className="text-[15px] font-normal text-dim">{current === 1 ? 'day' : 'days'}</span>
      </p>
      <p className="mt-1.5 text-xs text-dim sm:text-[13px]">Longest {plural(longest, 'day')}</p>
      <p className="mt-3 border-t border-rule pt-2.5 text-xs text-dim sm:text-[13px]">
        <span className="sm:hidden">{month.short}</span><span className="hidden sm:inline">{month.long}</span>
      </p>
    </>
  )
  const cls = `block min-w-0 rounded-xl bg-ink-2 p-3 ring-1 sm:px-4 sm:py-3.5 ${ring}`
  return to
    ? <Link to={to} className={`${cls} transition hover:bg-ink-3 active:bg-ink-3`}>{body}</Link>
    : <section aria-label={title} className={cls}>{body}</section>
}

const Num = ({ children }: { children: ReactNode }) => <b className="font-semibold whitespace-nowrap text-paper">{children}</b>

export function StreakCards({ habit, thisMonth, today }: { habit: Habit; thisMonth: MonthSummary; today: string }) {
  const { data: logs = [] } = useLogs()
  const stage = useMemo(() => {
    const days = showsByDay(logs)
    return { streak: stageStreak(days, today), month: monthStats(days, today.slice(0, 7)) }
  }, [logs, today])
  const name = monthName(today.slice(0, 7)).split(' ')[0]
  const abbr = name.slice(0, 3)
  const { shows, seconds, days } = stage.month

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <StreakCard icon={<PenLine size={15} className="shrink-0 text-ok" />} title="Joke streak" tone="text-ok" ring="ring-ok/30"
        current={habit.current} longest={habit.longest}
        month={{
          short: <>{abbr}: <Num>{thisMonth.active}</Num> / {plural(thisMonth.sofar, 'day')}</>,
          long: <>{name}: <Num>{thisMonth.active}</Num> of {plural(thisMonth.sofar, 'day')} active</>,
        }} />
      <StreakCard icon={<Mic size={15} className="shrink-0 text-tape" />} title="Stage streak" tone="text-tape" ring="ring-tape/30" to="/shows"
        current={stage.streak.current} longest={stage.streak.longest}
        month={shows
          ? {
            short: <>{abbr}: <Num>{plural(shows, 'show')}</Num> · <Num>{seconds < 3570 ? `${Math.round(seconds / 60)}m` : stageTotal(seconds)}</Num></>,
            long: <>{name}: <Num>{plural(shows, 'show')}</Num> · <Num>{stageTotal(seconds)}</Num> · {plural(days, 'mic day')}</>,
          }
          : { short: `${abbr}: no shows yet`, long: `${name}: no shows yet` }} />
    </div>
  )
}
