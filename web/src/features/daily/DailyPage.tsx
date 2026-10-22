/**
 * Daily joke: write at least one new joke a day. The nudge up top, a box to write today's, your
 * streaks, and a calendar ticking off every day you added a joke. Saved jokes land in Jokes
 * (under Thoughts) like any other, and the tick appears straight away.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import { PageHead } from '../../components/ui/pieces'
import { formatDate } from '../../lib/time'
import { QuickCapture } from '../today/QuickCapture'
import { DailyBanner } from './DailyBanner'
import { MonthCalendar } from './MonthCalendar'
import { useHabit } from './useHabit'

const focusBox = () => document.getElementById('quick-capture')?.focus()

export function DailyPage() {
  const { days, today, habit } = useHabit()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState<string | null>(today)
  const picked = selected ? days.get(selected) ?? [] : []
  const thisMonth = [...days.keys()].filter((d) => d.startsWith(today.slice(0, 7))).length

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHead title="Daily joke" />
      <DailyBanner habit={habit} onWrite={focusBox} />

      <div>
        <h2 className="mb-2 text-sm text-dim">{habit.gap === 0 ? 'Another one? Go on.' : "Today's joke"}</h2>
        <QuickCapture />
      </div>

      <dl className="grid grid-cols-3 gap-4 border-y border-rule py-5">
        {[
          ['Current streak', `${habit.current} day${habit.current === 1 ? '' : 's'}`],
          ['Longest streak', `${habit.longest} day${habit.longest === 1 ? '' : 's'}`],
          ['This month', `${thisMonth} day${thisMonth === 1 ? '' : 's'}`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-sm text-dim">{label}</dt>
            <dd className="headline mt-1 truncate text-[28px]">{value}</dd>
          </div>
        ))}
      </dl>

      <MonthCalendar month={month} onMonth={setMonth} days={days} today={today} selected={selected} onSelect={setSelected} />

      {selected && (
        <section>
          <h2 className="mb-2 font-semibold">{selected === today ? 'Today' : formatDate(`${selected}T12:00:00+05:30`)}</h2>
          {picked.length ? (
            <ul className="divide-y divide-rule border-y border-rule">
              {picked.map((b) => (
                <li key={b.id}>
                  <Link to={`/jokes/${b.id}`} className="block truncate py-3 hover:bg-ink-2/60">{b.setup}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-dim">No new jokes {selected === today ? 'yet today' : 'that day'}.</p>
          )}
        </section>
      )}
    </div>
  )
}
