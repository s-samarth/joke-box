/** Today: the daily joke nudge, then capture, then voice notes, observations, brainstorming, craft (your path and a lesson box), study (watchlist, analysis, links), your topic folders, what's coming up, what needs work, and how the last show went. */
import { Play } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useJokes, useTopics } from '../../api/library'
import { useLogs, useSetlists } from '../../api/shows'
import { SectionHead, Stars, StrengthTicks, Tape } from '../../components/ui/pieces'
import { statusOf, THOUGHTS, UNFINISHED } from '../../lib/jokeMeta'
import { clock } from '../../lib/duration'
import { formatDate, todayIst } from '../../lib/time'
import { DailyBanner } from '../daily/DailyBanner'
import { useHabit } from '../daily/useHabit'
import { LightBar } from '../sets/LightBar'
import { draftItems, optionalSeconds, totalSeconds } from '../sets/setlistMath'
import { InstallHint } from './InstallHint'
import { QuickCapture } from './QuickCapture'
import { TodayBrainstorm } from './TodayBrainstorm'
import { TodayCraft } from './TodayCraft'
import { TodayObservations } from './TodayObservations'
import { TodayStudy } from './TodayStudy'
import { TodayVoice } from './TodayVoice'
import { TopicFolders } from './TopicFolders'

const longDate = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })

export function TodayPage() {
  const [dateLabel] = useState(() => longDate.format(new Date()))
  const { data: jokes = [] } = useJokes()
  const { data: topics = [] } = useTopics()
  const { data: sets = [] } = useSetlists()
  const { data: logs = [] } = useLogs()
  const thoughts = topics.find((t) => t.is_system)
  const thoughtsCount = jokes.filter((b) => b.topic_id === thoughts?.id).length
  const today = todayIst()
  const upcoming = sets.filter((s) => s.show_date && s.show_date >= today).sort((a, b) => a.show_date!.localeCompare(b.show_date!))
  const nextSet = upcoming[0] ?? sets[0]
  const byId = new Map(jokes.map((b) => [b.id, b]))
  const needsWork = jokes
    .filter((b) => b.strength <= 2 || UNFINISHED.has(statusOf(b.status).toLowerCase()))
    .sort((a, b) => a.strength - b.strength || b.updated_at.localeCompare(a.updated_at))
  const lastShow = logs[0]
  const daily = useHabit()

  return (
    <div className="mx-auto max-w-2xl">
      {/* Waits for the jokes to load, so it never flashes "write a joke" at someone who already has. */}
      {!daily.loading && <div className="pt-6 lg:pt-10"><DailyBanner habit={daily.habit} /></div>}
      <InstallHint />
      <div className="pt-6 pb-6 lg:pt-10">
        <p className="text-dim">{dateLabel}</p>
        <h1 className="headline mt-1 text-[44px] sm:text-[56px]">Got something?</h1>
      </div>
      <QuickCapture />
      <TodayVoice />
      <TodayObservations />
      <TodayBrainstorm />
      <TodayCraft />
      <TodayStudy />
      <TopicFolders />

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
                  {nextSet.show_date ? formatDate(nextSet.show_date) : 'No date yet'}
                </p>
              </Link>
              <Link to={`/sets/${nextSet.id}/stage`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-tape px-3 font-semibold text-tape-ink">
                <Play size={16} /> Rehearse
              </Link>
            </div>
            <div className="space-y-2">
              {nextSet.items.slice(0, 3).map((item, i) => (
                <Tape key={item.joke_id} seed={i} optional={item.optional} className="px-4 py-2 text-lg leading-tight">
                  <span className="line-clamp-1">{byId.get(item.joke_id)?.setup ?? 'Deleted joke'}</span>
                </Tape>
              ))}
              {nextSet.items.length > 3 && <p className="pt-1 text-sm text-faint">and {nextSet.items.length - 3} more</p>}
            </div>
            <div className="mt-4">
              <LightBar total={totalSeconds(draftItems(nextSet.items))} optional={optionalSeconds(draftItems(nextSet.items))} target={nextSet.target_seconds} />
            </div>
          </div>
        ) : (
          <p className="text-dim">No sets yet. <Link to="/sets" className="text-tape underline-offset-4 hover:underline">Build one</Link> for your next spot.</p>
        )}
      </section>

      <section className="mt-12">
        <SectionHead title="Needs work">
          {thoughtsCount > 0 && <Link to={`/jokes?topic=${thoughts?.id}`} className="text-sm text-dim hover:text-paper">{thoughtsCount} in {THOUGHTS}</Link>}
        </SectionHead>
        {needsWork.length === 0 ? (
          <p className="text-dim">Nothing flagged. Every joke is marked done or strong.</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {needsWork.slice(0, 5).map((b) => (
              <li key={b.id}>
                <Link to={`/jokes/${b.id}`} className="flex items-center gap-4 py-3.5 hover:bg-ink-2/60">
                  <span className="min-w-0 flex-1 truncate">{b.setup}</span>
                  <span className="shrink-0 text-sm text-faint">{statusOf(b.status)}</span>
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
