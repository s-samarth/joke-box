/** Home brings voice and written capture together above the library and activity. */
import { Eye, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useLogs, useSetlists } from '../../api/shows'
import { SectionHead, Stars, Tape } from '../../components/ui/pieces'
import { clock } from '../../lib/duration'
import { formatDate } from '../../lib/time'
import { DailyBanner } from '../daily/DailyBanner'
import { useHabit } from '../daily/useHabit'
import { LightBar } from '../sets/LightBar'
import { beatTotal, beatsOf, setSummary } from '../sets/beats'
import { CaptureTabs, type CaptureTab } from './CaptureTabs'
import { InstallHint } from './InstallHint'
import { LibraryTiles } from './LibraryTiles'
import { TodayActivity } from './TodayActivity'
import { TodayBrainstorm } from './TodayBrainstorm'
import { TodayCraft } from './TodayCraft'
import { TodayStudy } from './TodayStudy'
import { TodayVoice } from './TodayVoice'
import { TopicFolders } from './TopicFolders'

const longDate = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })

export function TodayPage() {
  const [dateLabel] = useState(() => longDate.format(new Date()))
  const { data: sets = [] } = useSetlists()
  const { data: logs = [] } = useLogs()
  // The set you worked on last; sets have no show date.
  const nextSet = [...sets].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
  const lastShow = logs[0]
  const daily = useHabit()
  const [tab, setTab] = useState<CaptureTab>('observation')
  // The nudge's Write it opens the joke box here instead of leaving Home.
  const writeJoke = () => {
    setTab('joke')
    setTimeout(() => document.getElementById('quick-capture')?.focus())
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Waits for the jokes to load, so it never flashes "write a joke" at someone who already has. */}
      {!daily.loading && <div className="pt-6 lg:pt-10"><DailyBanner habit={daily.habit} onWrite={writeJoke} /></div>}
      <InstallHint />
      <div className="flex items-start justify-between gap-3 pt-6 pb-6 lg:pt-10">
        <div>
          <p className="text-dim">{dateLabel}</p>
          <h1 className="headline mt-1 text-[44px] sm:text-[56px]">Got something?</h1>
        </div>
        <Link to="/search" aria-label="Search everything" className="mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-dim ring-1 ring-rule hover:bg-ink-3 hover:text-paper">
          <Search size={20} />
        </Link>
      </div>
      <TodayVoice />
      <CaptureTabs tab={tab} onTab={setTab} />
      <LibraryTiles />
      <TodayActivity />
      <TodayBrainstorm />
      <TodayCraft />
      <TodayStudy />
      <TopicFolders />

      <section className="mt-12">
        <SectionHead title='Your latest set'>
          <Link to="/sets" className="text-sm text-dim hover:text-paper">All sets</Link>
        </SectionHead>
        {nextSet ? (
          <div className="rounded-xl bg-ink-2 p-4 ring-1 ring-rule">
            <div className="mb-4 flex items-start justify-between gap-3">
              <Link to={`/sets/${nextSet.id}`} className="min-w-0">
                <p className="truncate text-lg font-medium">{nextSet.name}</p>
                <p className="text-sm text-dim">
                  {setSummary(nextSet)}, {clock(nextSet.target_seconds)} slot
                </p>
              </Link>
              <Link to={`/sets/${nextSet.id}/stage`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-tape px-3 font-semibold text-tape-ink">
                <Eye size={16} /> Bird's eye view
              </Link>
            </div>
            <div className="space-y-2">
              {beatsOf(nextSet).slice(0, 3).map((beat, i) => (
                <Tape key={beat.id} seed={i} dim={!beat.cue} className="flex items-baseline justify-between gap-3 px-4 py-2 text-lg leading-tight">
                  <span className="line-clamp-1">{beat.cue || `Beat ${i + 1}`}</span><span className="shrink-0 font-sans text-sm tabular">{clock(beat.seconds)}</span>
                </Tape>
              ))}
              {beatsOf(nextSet).length > 3 && <p className="pt-1 text-sm text-faint">and {beatsOf(nextSet).length - 3} more beats</p>}
            </div>
            <div className="mt-4">
              <LightBar total={beatTotal(beatsOf(nextSet))} target={nextSet.target_seconds} />
            </div>
          </div>
        ) : (
          <p className="text-dim">No sets yet. <Link to="/sets" className="text-tape underline-offset-4 hover:underline">Build one</Link> for your next spot.</p>
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
