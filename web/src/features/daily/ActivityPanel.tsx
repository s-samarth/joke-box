/**
 * The top of Activity, shared with Home: the joke and stage streak cards, the calendar card (the
 * month's stage time and shows, its writing by kind, and every day with its dots), and the day
 * you tapped (today to begin with) as four counts.
 */
import { useMemo, useState } from 'react'
import { useLogs } from '../../api/shows'
import { monthStats } from '../shows/calendar/showMonth'
import { showsByDay } from '../shows/insights/timelineMath'
import { dayOf, monthSummary } from './activity'
import { DayDetail } from './DayDetail'
import { MonthCalendar } from './MonthCalendar'
import { StreakCards } from './StreakCards'
import { useActivity } from './useActivity'

export function ActivityPanel() {
  const { activity, today, habit } = useActivity()
  const { data: logs = [] } = useLogs()
  const stage = useMemo(() => showsByDay(logs), [logs])
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState<string | null>(today)
  const shown = monthSummary(activity, month, today)
  const thisMonth = monthSummary(activity, today.slice(0, 7), today)
  const picked = selected ?? today

  return (
    <div className="space-y-5">
      <StreakCards habit={habit} activity={activity} thisMonth={thisMonth} today={today} />
      <MonthCalendar month={month} onMonth={setMonth} activity={activity} summary={shown} stage={stage} stageMonth={monthStats(stage, month)}
        today={today} selected={selected} onSelect={(d) => setSelected(d === selected && d !== today ? today : d)} />
      <DayDetail date={picked} today={today} day={dayOf(activity, picked)} stage={stage} />
    </div>
  )
}
