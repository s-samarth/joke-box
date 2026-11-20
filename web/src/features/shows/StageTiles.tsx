/**
 * The top of Shows, above the tabs and filters: your stage streak and best, then this month's
 * shows, time on stage and mic days, as tiles. They count every show whatever the filters say,
 * which is why they sit above them. The streak follows the joke streak's rules (stageStreak).
 */
import { Mic } from 'lucide-react'
import { useMemo } from 'react'
import type { PerformanceLog } from '../../api/types'
import { useToday } from '../../lib/useToday'
import { monthName } from '../daily/activity'
import { monthStats, stageStreak, stageTotal } from './calendar/showMonth'
import { showsByDay } from './insights/timelineMath'
import { StatTile, TileGroup } from './StatTile'

const days = (n: number) => (n === 1 ? 'day' : 'days')

export function StageTiles({ logs }: { logs: PerformanceLog[] }) {
  const today = useToday()
  const { streak, month } = useMemo(() => {
    const byDay = showsByDay(logs)
    return { streak: stageStreak(byDay, today), month: monthStats(byDay, today.slice(0, 7)) }
  }, [logs, today])
  const minutes = Math.round(month.seconds / 60)
  const sofar = Number(today.slice(8))

  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_3fr]">
      <TileGroup title="Streaks" cols="grid-cols-2">
        <StatTile accent label={<><Mic size={13} className="shrink-0 text-tape" />Stage streak</>} value={streak.current} unit={days(streak.current)} />
        <StatTile label="Best" value={streak.longest} unit={days(streak.longest)} />
      </TileGroup>
      <TileGroup title={`${monthName(today.slice(0, 7)).split(' ')[0]} so far`} cols="grid-cols-3">
        <StatTile label="Shows" value={month.shows} />
        <StatTile label="On stage" value={minutes < 60 ? minutes : stageTotal(month.seconds)} unit={minutes < 60 ? 'min' : undefined} />
        <StatTile label="Mic days" value={month.days} unit={`/ ${sofar}`} />
      </TileGroup>
    </div>
  )
}
