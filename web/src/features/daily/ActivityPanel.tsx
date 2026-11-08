/**
 * Daily activity, the part both screens share: the streaks, the month's total split by kind, the
 * calendar, and the day you tapped (today to begin with). The Daily activity page lists what you
 * wrote that day; Home shows only the day's counts, so the rest of Home stays in reach.
 */
import { useState } from 'react'
import { dayOf, monthSummary } from './activity'
import { DayDetail } from './DayDetail'
import { MonthCalendar } from './MonthCalendar'
import { MonthMix } from './MonthMix'
import { useActivity } from './useActivity'

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`

export function ActivityPanel({ lists }: { lists: boolean }) {
  const { activity, today, habit } = useActivity()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState<string | null>(today)
  const shown = monthSummary(activity, month, today)
  const thisMonth = monthSummary(activity, today.slice(0, 7), today)

  return (
    <div className="space-y-6">
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
      {selected && <DayDetail date={selected} today={today} day={dayOf(activity, selected)} lists={lists} />}
    </div>
  )
}
