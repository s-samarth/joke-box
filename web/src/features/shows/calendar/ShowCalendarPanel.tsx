/**
 * The show calendar with everything it needs: the month you're on, the day you tapped and its
 * shows, and a show's detail (and its edit sheet) when you open one. The Shows page and Daily
 * activity both drop it in with the shows to plot.
 */
import { useMemo, useState } from 'react'
import { useTopics } from '../../../api/library'
import type { PerformanceLog } from '../../../api/types'
import { topicName } from '../../../lib/jokeMeta'
import { useToday } from '../../../lib/useToday'
import { showsByDay } from '../insights/timelineMath'
import { LogShowSheet } from '../LogShowSheet'
import { ShowDetail } from '../ShowDetail'
import { ShowCalendar } from './ShowCalendar'
import { ShowDayList } from './ShowDayList'

export function ShowCalendarPanel({ logs }: { logs: PerformanceLog[] }) {
  const today = useToday()
  const { data: topics = [] } = useTopics()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState<string | null>(null)
  const [viewing, setViewing] = useState<PerformanceLog | null>(null)
  const [editing, setEditing] = useState<PerformanceLog | null>(null)
  const days = useMemo(() => showsByDay(logs), [logs])
  const picked = selected ? days.get(selected) : undefined
  const topicNames = (ids: string[]) => ids.map((id) => topicName(topics.find((t) => t.id === id))).filter(Boolean).join(', ')
  const changeMonth = (m: string) => {
    setMonth(m)
    setSelected(null)
  }

  return (
    <div className="space-y-4">
      <ShowCalendar month={month} onMonth={changeMonth} days={days} today={today} selected={picked ? selected : null} onSelect={setSelected} />
      {selected && picked && <ShowDayList day={selected} shows={picked} onOpen={setViewing} />}
      {viewing && <ShowDetail log={viewing} topics={topicNames(viewing.topic_ids)} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null) }} />}
      {editing && <LogShowSheet log={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
