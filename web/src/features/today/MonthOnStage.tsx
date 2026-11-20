/** One gold line in Home's daily activity: this month's shows, time on stage and mic days. Opens Shows. */
import { ChevronRight, Mic } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { useLogs } from '../../api/shows'
import { useToday } from '../../lib/useToday'
import { monthName } from '../daily/activity'
import { showsByDay } from '../shows/insights/timelineMath'
import { monthStats, plural, stageTotal } from '../shows/calendar/showMonth'

export function MonthOnStage() {
  const { data: logs = [] } = useLogs()
  const today = useToday()
  const stats = useMemo(() => monthStats(showsByDay(logs), today.slice(0, 7)), [logs, today])
  // Nothing to say to someone who has never logged a show.
  if (!logs.length) return null
  const month = monthName(today.slice(0, 7)).split(' ')[0]

  return (
    <Link to="/shows" className="flex items-center gap-3 rounded-xl bg-tape/10 px-4 py-3 ring-1 ring-tape/30 hover:bg-tape/15">
      <Mic size={20} className="shrink-0 text-tape" />
      <span className="min-w-0 flex-1 text-[15px]">
        {month} on stage:{' '}
        {stats.shows
          ? <><b className="font-semibold whitespace-nowrap">{plural(stats.shows, 'show')}</b> · <b className="font-semibold whitespace-nowrap">{stageTotal(stats.seconds)}</b><span className="whitespace-nowrap text-dim"> · {plural(stats.days, 'mic day')}</span></>
          : <span className="text-dim">no shows yet</span>}
      </span>
      <ChevronRight size={16} className="shrink-0 text-dim" />
    </Link>
  )
}
