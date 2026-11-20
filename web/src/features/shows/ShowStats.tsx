/** Four totals for whatever is filtered, as tiles: pick a period or venue in the toolbar and they follow. */
import type { PerformanceLog } from '../../api/types'
import { long } from '../../lib/duration'
import { totals } from './logStats'
import { averageLpm, formatLpm } from './lpm'
import { StatTile, TileGroup } from './StatTile'

export function ShowStats({ logs }: { logs: PerformanceLog[] }) {
  const t = totals(logs)
  const laughs = averageLpm(logs)
  return (
    <>
      <TileGroup title="Totals for these filters" cols="grid-cols-2 sm:grid-cols-4">
        <StatTile label="Shows" value={t.shows} />
        <StatTile label="On stage" value={long(t.stageSeconds)} />
        {t.rating === null ? <StatTile label="Avg rating" value="None yet" /> : <StatTile label="Avg rating" value={t.rating.toFixed(1)} unit="of 5" />}
        {t.audience === null ? <StatTile label="Median crowd" value="None yet" /> : <StatTile label="Median crowd" value={Math.round(t.audience)} unit="people" />}
      </TileGroup>
      {laughs && <p className="mt-3 text-[15px] tabular">{formatLpm(laughs.lpm)} <span className="text-dim">over the {laughs.shows === 1 ? 'show' : `${laughs.shows} shows`} you counted laughs for</span></p>}
      <p className="mt-2 text-xs text-faint">The average rating and LPM weight each show by its length, so a long set counts for more.</p>
    </>
  )
}
