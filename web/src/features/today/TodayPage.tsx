/** Today: capture first, then what's coming up, what needs work, and how the last show went. */
import { Play } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useBits, useTopics } from '../../api/library'
import { useLogs, useSetlists } from '../../api/shows'
import { SectionHead, Stars, StrengthTicks, Tape } from '../../components/ui/bits'
import { UNFINISHED } from '../../lib/bitMeta'
import { clock } from '../../lib/duration'
import { formatDate, todayIst } from '../../lib/time'
import { LightBar } from '../sets/LightBar'
import { totalSeconds } from '../sets/setlistMath'
import { QuickCapture } from './QuickCapture'

const longDate = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })

export function TodayPage() {
  const [dateLabel] = useState(() => longDate.format(new Date()))
  const { data: bits = [] } = useBits()
  const { data: topics = [] } = useTopics()
  const { data: sets = [] } = useSetlists()
  const { data: logs = [] } = useLogs()
  const inbox = topics.find((t) => t.is_system)
  const inboxCount = bits.filter((b) => b.topic_id === inbox?.id).length
  const today = todayIst()
  const upcoming = sets.filter((s) => s.show_date && s.show_date >= today).sort((a, b) => a.show_date!.localeCompare(b.show_date!))
  const nextSet = upcoming[0] ?? sets[0]
  const byId = new Map(bits.map((b) => [b.id, b]))
  const needsWork = bits
    .filter((b) => b.strength <= 2 || UNFINISHED.has((b.status ?? '').toLowerCase()))
    .sort((a, b) => a.strength - b.strength || b.updated_at.localeCompare(a.updated_at))
  const lastShow = logs[0]

  return (
    <div className="mx-auto max-w-2xl">
      <div className="pt-6 pb-6 lg:pt-10">
        <p className="text-dim">{dateLabel}</p>
        <h1 className="headline mt-1 text-[44px] sm:text-[56px]">Got something?</h1>
      </div>
      <QuickCapture />

      <section className="mt-12">
        <SectionHead title={upcoming[0] ? 'Next up' : 'Your latest set'}>
          <Link to="/sets" className="text-sm text-dim hover:text-paper">All sets</Link>
        </SectionHead>
        {nextSet ? (
          <div className="rounded-xl bg-ink-2 p-4 ring-1 ring-rule">
            <div className="mb-4 flex items-start justify-between gap-3">
              <Link to={`/sets/${nextSet.id}`} className="min-w-0">
                <p className="truncate text-lg font-medium">{nextSet.name}</p>
                <p className="text-sm text-dim">
                  {[nextSet.show_date ? formatDate(nextSet.show_date) : null, nextSet.venue_name].filter(Boolean).join(', ') || 'No date yet'}
                </p>
              </Link>
              <Link to={`/sets/${nextSet.id}/stage`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-tape px-3 font-semibold text-tape-ink">
                <Play size={16} /> Rehearse
              </Link>
            </div>
            <div className="space-y-2">
              {nextSet.items.slice(0, 3).map((item, i) => (
                <Tape key={item.bit_id} seed={i} className="px-4 py-2 text-lg leading-tight">
                  <span className="line-clamp-1">{byId.get(item.bit_id)?.setup ?? 'Deleted bit'}</span>
                </Tape>
              ))}
              {nextSet.items.length > 3 && <p className="pt-1 text-sm text-faint">and {nextSet.items.length - 3} more</p>}
            </div>
            <div className="mt-4">
              <LightBar total={totalSeconds(nextSet.items.map((i) => ({ bitId: i.bit_id, duration: i.duration_seconds })))} target={nextSet.target_seconds} />
            </div>
          </div>
        ) : (
          <p className="text-dim">No sets yet. <Link to="/sets" className="text-tape underline-offset-4 hover:underline">Build one</Link> for your next spot.</p>
        )}
      </section>

      <section className="mt-12">
        <SectionHead title="Needs work">
          {inboxCount > 0 && <Link to={`/bits?topic=${inbox?.id}`} className="text-sm text-dim hover:text-paper">{inboxCount} in Inbox</Link>}
        </SectionHead>
        {needsWork.length === 0 ? (
          <p className="text-dim">Nothing flagged. Every bit is marked done or strong.</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {needsWork.slice(0, 5).map((b) => (
              <li key={b.id}>
                <Link to={`/bits/${b.id}`} className="flex items-center gap-4 py-3.5 hover:bg-ink-2/60">
                  <span className="min-w-0 flex-1 truncate">{b.setup}</span>
                  <span className="shrink-0 text-sm text-faint">{b.status}</span>
                  <StrengthTicks strength={b.strength} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <SectionHead title="Last show">
          <Link to="/shows?log=1" className="text-sm text-tape hover:underline">Log a show</Link>
        </SectionHead>
        {lastShow ? (
          <Link to="/shows" className="flex items-center justify-between gap-4 rounded-xl bg-ink-2 px-4 py-3.5 ring-1 ring-rule">
            <span>
              <span className="block font-medium">{lastShow.venue_name}</span>
              <span className="block text-sm text-dim">{formatDate(lastShow.performed_at)}, {clock(lastShow.duration_seconds)} on stage, {lastShow.audience_size} in the room</span>
            </span>
            <Stars rating={lastShow.rating} />
          </Link>
        ) : (
          <p className="text-dim">No shows logged yet. After your next spot, log it while it's fresh.</p>
        )}
      </section>
    </div>
  )
}
