/**
 * Highlights on Activity: the records shelf (best month for each measure) that doubles as the
 * switch for the month-by-month chart, then the last 12 months as a grid of days across the whole
 * width, and big days under it, two columns wide where there's room.
 */
import { useMemo, useState } from 'react'
import { useLogs } from '../../../api/shows'
import { showsByDay } from '../../shows/insights/timelineMath'
import { useActivity } from '../useActivity'
import { BigDaysList } from './BigDaysList'
import { bigDays, lastTwelve, monthTotals, yearGrid, type Measure } from './highlightMath'
import { MEASURES } from './measures'
import { MonthChart } from './MonthChart'
import { RecordShelf } from './RecordShelf'
import { YearGrid } from './YearGrid'

export function Highlights() {
  const { activity, today } = useActivity()
  const { data: logs = [] } = useLogs()
  const [picked, setPicked] = useState<Measure>('jokes')
  const data = useMemo(() => {
    const stage = showsByDay(logs)
    const rows = monthTotals(activity, stage, today)
    return { rows, window: lastTwelve(rows, today), days: bigDays(activity, stage, logs, today), grid: yearGrid(activity, today) }
  }, [activity, logs, today])
  const measure = MEASURES.find((m) => m.key === picked) ?? MEASURES[0]

  if (!data.rows.length) return null
  return (
    <section aria-labelledby="highlights-title" className="@container space-y-3">
      <div className="mb-4">
        <h2 id="highlights-title" className="headline text-[30px]">Highlights</h2>
        <p className="mt-1 text-sm text-dim">Your best months. Tap one to see every month.</p>
      </div>
      <RecordShelf rows={data.rows} picked={picked} onPick={setPicked} />
      <MonthChart rows={data.rows} window={data.window} measure={measure} today={today} />
      <div className="pt-2">
        <h3 className="mb-2 text-sm text-dim">Days that stood out, last 12 months</h3>
        <YearGrid weeks={data.grid.weeks} top={data.grid.top} />
      </div>
      <div className="pt-2">
        <h3 className="mb-1 text-sm text-dim">Big days</h3>
        <BigDaysList days={data.days} />
      </div>
    </section>
  )
}
