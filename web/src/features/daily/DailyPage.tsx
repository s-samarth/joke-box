/**
 * Daily activity: everything you wrote, day by day. The joke nudge and today's joke box stay on
 * top (only jokes keep the streak), then the streaks, the month's total split by kind, and a
 * calendar where every day shows how much you wrote and of which kind. Tap a day to see its counts
 * and the pieces themselves.
 */
import { useState } from 'react'
import { PageHead } from '../../components/ui/pieces'
import { QuickCapture } from '../today/QuickCapture'
import { dayOf, monthSummary } from './activity'
import { DailyBanner } from './DailyBanner'
import { DayDetail } from './DayDetail'
import { MonthCalendar } from './MonthCalendar'
import { MonthMix } from './MonthMix'
import { useActivity } from './useActivity'

const focusBox = () => document.getElementById('quick-capture')?.focus()
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`

export function DailyPage() {
  const { activity, today, habit } = useActivity()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState<string | null>(today)
  const shown = monthSummary(activity, month, today)
  const thisMonth = monthSummary(activity, today.slice(0, 7), today)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHead title="Daily activity" />
      <DailyBanner habit={habit} onWrite={focusBox} />

      <div>
        <h2 className="mb-2 text-sm text-dim">{habit.gap === 0 ? 'Another one? Go on.' : "Today's joke"}</h2>
        <QuickCapture />
      </div>

      <dl className="grid grid-cols-3 gap-4 border-y border-rule py-5">
        {[
          ['Joke streak', days(habit.current)],
          ['Longest streak', days(habit.longest)],
          ['Active days', `${thisMonth.active} / ${thisMonth.sofar}`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-sm text-dim">{label}</dt>
            <dd className="headline mt-1 truncate text-[28px]">{value}</dd>
          </div>
        ))}
      </dl>

      <MonthMix month={month} today={today} summary={shown} />
      <MonthCalendar month={month} onMonth={setMonth} activity={activity} summary={shown} today={today} selected={selected} onSelect={setSelected} />
      {selected && <DayDetail date={selected} today={today} day={dayOf(activity, selected)} />}
    </div>
  )
}
