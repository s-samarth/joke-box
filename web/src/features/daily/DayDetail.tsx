/**
 * The day you tapped on the calendar: its three counts up top (jokes, premises, observations),
 * then (with `lists`) what you wrote, grouped by kind, each linking to its page. On a phone this is
 * where the counts live, since a day's box only has room for dots. Home shows the counts alone.
 */
import { Link } from 'react-router'
import { formatDate } from '../../lib/time'
import { countsOf, KIND_META, KINDS, totalOf, type DayActivity, type Kind } from './activity'

interface Row {
  id: string
  to: string
  text: string
}

/** Each kind's items as links: a joke by its setup, a premise by its take, an observation by its text. */
function rows(day: DayActivity): Record<Kind, Row[]> {
  return {
    jokes: day.jokes.map((j) => ({ id: j.id, to: `/jokes/${j.id}`, text: j.setup || j.punchline || 'Untitled joke' })),
    premises: day.premises.map((p) => ({ id: p.id, to: `/premises/${p.id}`, text: p.take || 'Untitled premise' })),
    observations: day.observations.map((o) => ({ id: o.id, to: `/observations/${o.id}`, text: o.text || 'Empty observation' })),
  }
}

const label = (k: Kind) => KIND_META[k].many[0].toUpperCase() + KIND_META[k].many.slice(1)

export function DayDetail({ date, today, day, lists: showLists = true }: { date: string; today: string; day: DayActivity; lists?: boolean }) {
  const counts = countsOf(day)
  const total = totalOf(counts)
  const lists = rows(day)
  const isToday = date === today

  return (
    <section aria-label="The day you picked">
      <h2 className="mb-3 font-semibold">
        {isToday ? 'Today' : formatDate(`${date}T12:00:00+05:30`)}
        <span className="font-normal text-dim"> · {total ? `${total} written` : 'nothing written'}</span>
      </h2>

      <dl className="grid grid-cols-3 gap-2 rounded-xl border border-rule bg-ink-2 p-3 sm:p-4">
        {KINDS.map((k) => (
          <div key={k} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-dim sm:text-sm">
              <span className={`size-2 shrink-0 rounded-full ${KIND_META[k].dot}`} />
              <span className="truncate">{label(k)}</span>
            </dt>
            <dd className={`headline mt-1 text-[28px] tabular ${counts[k] ? KIND_META[k].text : 'text-faint'}`}>{counts[k]}</dd>
          </div>
        ))}
      </dl>

      {total === 0 && <p className="mt-4 text-dim">Nothing written {isToday ? 'yet today' : 'that day'}.</p>}

      {showLists && KINDS.filter((k) => counts[k]).map((k) => (
        <div key={k} className="mt-5">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-dim">
            <span className={`size-2 rounded-full ${KIND_META[k].dot}`} />{label(k)}
          </h3>
          <ul className="divide-y divide-rule border-y border-rule">
            {lists[k].map((r) => (
              <li key={r.id}>
                <Link to={r.to} className="block truncate py-3 hover:bg-ink-2/60">{r.text}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
