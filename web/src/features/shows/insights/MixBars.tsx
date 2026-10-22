/**
 * How each group's nights went: one bar per group split into rough (2 stars or less, blue), okay
 * (3 stars, grey) and great (4 or more, gold), best groups first. The number beside it is the
 * group's rating against your usual, then how many shows. A joke that's half great and half rough
 * looks very different here from one that's always okay, which an average alone would hide.
 */
import { long } from '../../../lib/duration'
import type { Breakdown, Group } from './insightMath'
import { MIN_SHOWS } from './insightMath'
import { TipBox } from './TipBox'
import { useTip } from './useTip'
import { ABOVE, BELOW, OKAY, signed } from './vizColors'

const pct = (n: number) => `${Math.round(n * 100)}%`

function details(g: Group): string[] {
  return [
    `${pct(g.great)} great, ${pct(1 - g.great - g.rough)} okay, ${pct(g.rough)} rough`,
    `${signed(g.delta)} on your usual`,
    `${g.shows} shows, ${long(g.seconds)} on stage`,
  ]
}

export function MixBars({ data, empty }: { data: Breakdown; empty: string }) {
  const { box, tip, on } = useTip()
  if (!data.ranked.length) {
    return <p className="text-sm text-dim">{empty} Each needs {MIN_SHOWS} shows before it's compared.</p>
  }
  return (
    <div ref={box} className="relative">
      <ul className="space-y-1">
        {data.ranked.map((g) => {
          const parts = [{ share: g.rough, color: BELOW }, { share: 1 - g.great - g.rough, color: OKAY }, { share: g.great, color: ABOVE }].filter((p) => p.share > 0)
          return (
            <li key={g.key} {...on(`${g.rating.toFixed(1)} stars: ${g.label}`, details(g))}
              className="grid grid-cols-[minmax(0,8rem)_1fr_4.5rem] items-center gap-3 rounded-md py-1 outline-none hover:bg-ink-3/60 focus-visible:ring-2 focus-visible:ring-tape sm:grid-cols-[minmax(0,11rem)_1fr_5rem]">
              <span className="truncate text-sm">{g.label}</span>
              <span className="flex h-3 gap-[2px] overflow-hidden rounded-[4px]">
                {parts.map((p) => <span key={p.color} style={{ flexGrow: p.share, background: p.color }} />)}
              </span>
              <span className="text-right text-sm tabular">
                {signed(g.delta)} <span className="ml-1 text-faint">{g.shows}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
        {[['Rough, 2★ or less', BELOW], ['Okay, 3★', OKAY], ['Great, 4★ or more', ABOVE]].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: color }} />{label}</span>
        ))}
        <span className="text-faint">Right: rating against your usual, then shows</span>
      </div>
      {data.few.length > 0 && (
        <p className="mt-3 text-sm text-dim">
          Fewer than {MIN_SHOWS} shows, so not compared yet: {data.few.map((g) => `${g.label} (${g.shows})`).join(', ')}.
        </p>
      )}
      <TipBox tip={tip} />
    </div>
  )
}
