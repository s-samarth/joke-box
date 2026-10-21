/**
 * Better or worse than your usual: one row per group, a bar growing right (gold) when it rates
 * above your overall rating and left (blue) when below. The centre hairline is "your usual".
 * The number and show count sit beside every bar, so hovering only adds detail.
 */
import { long } from '../../../lib/duration'
import type { Breakdown, Group } from './insightMath'
import { MIN_SHOWS } from './insightMath'
import { TipBox } from './TipBox'
import { useTip } from './useTip'
import { ABOVE, BELOW, signed } from './vizColors'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function details(g: Group): string[] {
  return [
    `${signed(g.delta)} on your usual`,
    `${plural(g.shows, 'show')}, ${long(g.seconds)} on stage`,
    `${Math.round(g.great * 100)}% rated 4 stars or more`,
  ]
}

export function DeltaBars({ data, empty }: { data: Breakdown; empty: string }) {
  const { box, tip, on } = useTip()
  // At least half a star either way, so a 0.1 difference doesn't fill the whole track.
  const reach = Math.max(0.5, ...data.ranked.map((g) => Math.abs(g.delta)))

  if (!data.ranked.length) {
    return <p className="text-sm text-dim">{empty} {data.few.length > 0 && `Each needs ${MIN_SHOWS} shows before it's compared.`}</p>
  }
  return (
    <div ref={box} className="relative">
      <ul className="space-y-1">
        {data.ranked.map((g) => {
          const width = `${(Math.abs(g.delta) / reach) * 50}%`
          const up = g.delta >= 0
          return (
            <li key={g.key} {...on(`${g.rating.toFixed(1)} stars: ${g.label}`, details(g))}
              className="grid grid-cols-[minmax(0,8.5rem)_1fr_4.5rem] items-center gap-3 rounded-md py-1 outline-none hover:bg-ink-3/60 focus-visible:ring-2 focus-visible:ring-tape sm:grid-cols-[minmax(0,11rem)_1fr_5rem]">
              <span className="truncate text-sm">{g.label}</span>
              <span className="relative h-3">
                <span className="absolute inset-y-[-4px] left-1/2 w-px bg-rule-strong" />
                <span className={`absolute inset-y-0 ${up ? 'left-1/2 rounded-r-[4px]' : 'right-1/2 rounded-l-[4px]'}`} style={{ width, background: up ? ABOVE : BELOW }} />
              </span>
              <span className="text-right text-sm tabular">
                {signed(g.delta)} <span className="ml-1 text-faint">{g.shows}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-faint">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: BELOW }} />Below your usual</span>
        <span className="hidden sm:inline">Grey number: how many shows</span>
        <span className="flex items-center gap-1.5">Above your usual<span className="size-2.5 rounded-sm" style={{ background: ABOVE }} /></span>
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
