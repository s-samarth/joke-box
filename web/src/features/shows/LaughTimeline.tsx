/** A show's laughs along the set, from the set-review engine: one bar per laugh, as tall as its
 * points, so the hot stretches and the dead ones show at a glance (like the "most replayed"
 * bar on a video). Applause breaks are the full-height pale bars. */
import type { ShowReview } from '../../api/types'
import { clock } from '../../lib/duration'

const HEIGHT = 48

export function LaughTimeline({ review, seconds, setupOf }: { review: ShowReview; seconds: number; setupOf: Map<string, string> }) {
  const laughs = review.events.filter((e) => e.kind === 'laugh')
  const breaks = review.events.length - laughs.length
  const length = Math.max(seconds, ...review.events.map((e) => e.end), 1)
  const summary = `${laughs.length} laughs and ${breaks} applause ${breaks === 1 ? 'break' : 'breaks'} over ${clock(length)}`
  return (
    <div className="mt-5">
      <h3 className="text-sm text-dim">Laughs through the set</h3>
      <div role="img" aria-label={summary} className="relative mt-1.5 rounded-md bg-ink-3" style={{ height: HEIGHT }}>
        {review.events.map((e) => {
          const left = (e.start / length) * 100
          const width = Math.max(((e.end - e.start) / length) * 100, 0.6)
          const tall = e.kind === 'applause' ? HEIGHT : (e.points / 5) * HEIGHT
          const joke = e.joke_id ? setupOf.get(e.joke_id) : undefined
          const label = `${clock(e.start)} · ${e.kind === 'applause' ? 'applause' : `${e.points} pt`}${joke ? ` · ${joke}` : ''}`
          return (
            <span key={`${e.start}-${e.kind}`} title={label}
              className={`absolute bottom-0 rounded-sm ${e.kind === 'applause' ? 'bg-paper/70' : 'bg-tape'}`}
              style={{ left: `${left}%`, width: `${width}%`, height: tall }} />
          )
        })}
      </div>
      <p className="mt-1 flex justify-between text-xs text-faint"><span>0:00</span><span>{summary}</span><span>{clock(length)}</span></p>
    </div>
  )
}
