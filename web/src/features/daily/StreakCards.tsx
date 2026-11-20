/**
 * Two matching cards at the top of daily activity (Home and Daily activity): writing in green,
 * the stage in gold (see StreakCard). The joke card counts days with a new joke; the stage card
 * counts days with a show and opens Shows. Streaks run across months; only the bottom line is the
 * month. There's no stage nudge: the streak just says how it stands.
 */
import { Mic, PenLine } from 'lucide-react'
import { useMemo } from 'react'
import { useLogs } from '../../api/shows'
import { monthStats, stageStreak, stageTotal } from '../shows/calendar/showMonth'
import { showsByDay } from '../shows/insights/timelineMath'
import { monthName, type Activity, type MonthSummary } from './activity'
import { recentDays, type Habit } from './dailyMath'
import { StreakCard } from './StreakCard'
import { TONES } from './streakTones'

const STRIP_DAYS = 14

interface Props {
  habit: Habit
  activity: Activity
  thisMonth: MonthSummary
  today: string
}

export function StreakCards({ habit, activity, thisMonth, today }: Props) {
  const { data: logs = [] } = useLogs()
  const stage = useMemo(() => {
    const days = showsByDay(logs)
    return { days, streak: stageStreak(days, today), month: monthStats(days, today.slice(0, 7)) }
  }, [logs, today])
  const recent = recentDays(today, STRIP_DAYS)
  const name = monthName(today.slice(0, 7)).split(' ')[0]
  const { shows, seconds, days } = stage.month
  const minutes = Math.round(seconds / 60)

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <StreakCard icon={<PenLine size={15} className="shrink-0 text-ok" />} title="Joke streak" tone={TONES.joke} counted="a joke"
        current={habit.current} longest={habit.longest}
        strip={recent.map((day) => ({ day, on: Boolean(activity.get(day)?.jokes.length) }))}
        month={{ name, items: [{ value: thisMonth.active, unit: `/ ${thisMonth.sofar} days active` }] }} />
      <StreakCard icon={<Mic size={15} className="shrink-0 text-tape" />} title="Stage streak" tone={TONES.stage} counted="a show" to="/shows"
        current={stage.streak.current} longest={stage.streak.longest}
        strip={recent.map((day) => ({ day, on: stage.days.has(day) }))}
        month={{
          name,
          empty: 'No shows yet',
          items: shows ? [
            { value: shows, unit: shows === 1 ? 'show' : 'shows' },
            minutes < 60 ? { value: minutes, unit: 'min' } : { value: stageTotal(seconds), unit: '' },
            { value: days, unit: days === 1 ? 'mic day' : 'mic days', wide: true },
          ] : [],
        }} />
    </div>
  )
}
