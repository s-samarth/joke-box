/**
 * Topics over time: a row per topic, a square per month, coloured by how that topic went that
 * month (brighter gold for better). Empty squares are months you didn't do it, so you can see when
 * a bit started, how often it ran, whether it got better, and when you dropped it. Topics are in
 * the order you first did them. Wider than a phone, so it scrolls sideways inside its card, with
 * the topic names pinned (their shadow paints over squares sliding underneath).
 */
import { useEffect } from 'react'
import { weightedRating } from '../logStats'
import type { TopicRow } from './formMath'
import type { Month } from './timelineMath'
import { TipBox } from './TipBox'
import { useTip, useWidth } from './useTip'
import { RATING_COLORS, ratingColor } from './vizColors'

const GAP = 3
/** Room for the topic names and the show counts either side of the squares. */
const SIDES = 210

export function TopicGrid({ rows, months }: { rows: TopicRow[]; months: Month[] }) {
  const { box, tip, on } = useTip()
  const { ref, width } = useWidth<HTMLDivElement>()
  // Squares grow to fill the card (14 to 28px); past that the grid scrolls sideways.
  const CELL = Math.min(28, Math.max(14, Math.floor((width - SIDES) / Math.max(1, months.length)) - GAP))
  // A month name every few columns, about 44px apart, so the names never run into each other.
  const every = Math.max(1, Math.ceil(44 / (CELL + GAP)))
  const label = (m: Month, i: number) => (i % every === 0 ? m.label : '')
  // When it's wider than the screen, open on the latest months: they matter most.
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth
  }, [ref, width, months.length])

  return (
    <div ref={box} className="relative">
      <div ref={ref} className="overflow-x-auto pb-2">
        <table className="border-separate" style={{ borderSpacing: `${GAP}px` }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-ink-2 shadow-[-3px_0_0_0_var(--color-ink-2),3px_0_0_0_var(--color-ink-2)]" />
              {months.map((m, i) => (
                <th key={m.key} className="h-5 p-0 align-bottom" style={{ width: CELL, minWidth: CELL }}>
                  <span className="block w-0 overflow-visible whitespace-nowrap text-left text-[10px] font-normal text-faint">{label(m, i)}</span>
                </th>
              ))}
              <th className="pl-2 text-right text-[11px] font-normal text-faint">Shows</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="sticky left-0 z-10 max-w-36 truncate bg-ink-2 pr-2 text-left text-sm font-normal shadow-[-3px_0_0_0_var(--color-ink-2),3px_0_0_0_var(--color-ink-2)]">{r.label}</th>
                {r.months.map((shows, i) => {
                  const m = months[i]
                  if (!shows.length) return <td key={m.key} className="rounded-[3px] bg-ink-3/60 p-0" style={{ width: CELL, height: CELL }} />
                  const rating = weightedRating(shows) ?? 3
                  return (
                    <td key={m.key} {...on(`${r.label}, ${m.label}`, [`${rating.toFixed(1)} stars over ${shows.length} show${shows.length === 1 ? '' : 's'}`])}
                      className="rounded-[3px] p-0 outline-none hover:ring-2 hover:ring-paper/60 focus-visible:ring-2 focus-visible:ring-tape"
                      style={{ width: CELL, height: CELL, background: ratingColor(rating) }} />
                  )
                })}
                <td className="pl-2 text-right text-sm tabular text-dim">{r.shows}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
        <span className="flex items-center gap-1.5">Rough<span className="flex gap-[2px]">{RATING_COLORS.map((c) => <span key={c} className="size-2.5 rounded-[2px]" style={{ background: c }} />)}</span>Great</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-ink-3/60" />Not done that month</span>
      </div>
      <TipBox tip={tip} />
    </div>
  )
}
