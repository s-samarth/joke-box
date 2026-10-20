/** Shows as a timeline: a big day number, the venue, and how it went. Grouped by month when sorted by date. */
import type { PerformanceLog } from '../../api/types'
import { Stars } from '../../components/ui/bits'
import { clock } from '../../lib/duration'

const month = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'long', year: 'numeric' })
const day = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' })
const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' })
const shortMonth = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' })

function Row({ log, onOpen, showMonth }: { log: PerformanceLog; onOpen: () => void; showMonth: boolean }) {
  const d = new Date(log.performed_at)
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 py-3.5 text-left hover:bg-ink-2/60">
        <span className="w-12 shrink-0 text-center">
          <span className="headline block text-[32px] tabular">{day.format(d)}</span>
          <span className="block text-xs text-faint">{showMonth ? shortMonth.format(d) : weekday.format(d)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg">{log.venue_name}</span>
          <span className="block text-sm text-dim">{clock(log.duration_seconds)} on stage, {log.audience_size} in the room</span>
        </span>
        <Stars rating={log.rating} />
      </button>
    </li>
  )
}

export function ShowTimeline({ logs, grouped, onOpen }: { logs: PerformanceLog[]; grouped: boolean; onOpen: (l: PerformanceLog) => void }) {
  if (!grouped) {
    return <ul className="divide-y divide-rule border-y border-rule">{logs.map((l) => <Row key={l.id} log={l} showMonth onOpen={() => onOpen(l)} />)}</ul>
  }
  const groups = new Map<string, PerformanceLog[]>()
  for (const l of logs) {
    const key = month.format(new Date(l.performed_at))
    groups.set(key, [...(groups.get(key) ?? []), l])
  }
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([name, items]) => (
        <section key={name}>
          <h2 className="mb-1 text-sm text-dim">{name}</h2>
          <ul className="divide-y divide-rule border-y border-rule">{items.map((l) => <Row key={l.id} log={l} showMonth={false} onOpen={() => onOpen(l)} />)}</ul>
        </section>
      ))}
    </div>
  )
}
