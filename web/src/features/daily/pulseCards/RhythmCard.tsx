/**
 * When you write, as a punch card: weekdays down, parts of the day across, each dot as big as the
 * pieces written then over the last 90 days. The busiest one is gold.
 */
import { PARTS, WEEKDAYS, type Rhythm } from '../pulseTrends'
import { PulseCard } from './PulseCard'

const PLURAL_PART: Record<string, string> = { Morning: 'mornings', Afternoon: 'afternoons', Evening: 'evenings', Night: 'nights' }

export function RhythmCard({ rhythm }: { rhythm: Rhythm }) {
  const { grid, busiest, total } = rhythm
  const max = Math.max(...grid.flat())
  return (
    <PulseCard title="When you write">
      <div role="img" aria-label={`Mostly ${busiest.day.slice(0, -1)} ${PLURAL_PART[busiest.part]}: ${busiest.count} of ${total} pieces in the last 90 days`}
        className="grid grid-cols-[2.25rem_repeat(4,minmax(0,1fr))] items-center gap-x-1 gap-y-1.5 text-[11px]">
        <span />
        {PARTS.map((p) => <span key={p} className="truncate text-center text-faint">{p}</span>)}
        {WEEKDAYS.map((d, r) => (
          <div key={d} className="contents">
            <span className="text-faint">{d.slice(0, 3)}</span>
            {grid[r].map((n, c) => {
              const size = n ? 6 + (n / max) * 14 : 4
              const top = d === busiest.day && PARTS[c] === busiest.part
              return (
                <span key={c} className="flex h-5 items-center justify-center">
                  <span className={`rounded-full ${top ? 'bg-tape' : n ? 'bg-paper/55' : 'bg-ink-4'}`} style={{ width: size, height: size }} />
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm">Mostly <b className="font-semibold">{busiest.day.slice(0, -1)} {PLURAL_PART[busiest.part]}</b> <span className="text-dim">({busiest.count} of {total} pieces)</span></p>
    </PulseCard>
  )
}
