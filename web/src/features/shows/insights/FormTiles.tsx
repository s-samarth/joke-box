/**
 * Recent form: four numbers for your latest shows, each with how it moved against the same number
 * of shows just before. Green with an up or down arrow when it moved the good way, red the bad
 * way; set length has no good way, so it stays grey.
 */
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { long } from '../../../lib/duration'
import type { Form, FormStats } from './formMath'

interface Tile {
  label: string
  value: (s: FormStats) => string
  /** Change from before to now, in the tile's own units; null if it can't be worked out. */
  change: (now: FormStats, before: FormStats) => number | null
  show: (d: number) => string
  /** Which way is good: up, down, or neither. */
  good: 1 | -1 | 0
  /** Changes smaller than this count as flat. */
  flat: number
}

const pct = (n: number) => `${Math.round(n * 100)}%`
const pts = (d: number) => `${d > 0 ? '+' : '−'}${Math.abs(Math.round(d * 100))} pts`

const TILES: Tile[] = [
  { label: 'Avg rating', value: (s) => (s.rating === null ? 'None' : s.rating.toFixed(1)), change: (a, b) => (a.rating === null || b.rating === null ? null : a.rating - b.rating), show: (d) => `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}`, good: 1, flat: 0.05 },
  { label: '4 stars or more', value: (s) => pct(s.great), change: (a, b) => a.great - b.great, show: pts, good: 1, flat: 0.005 },
  { label: '2 stars or less', value: (s) => pct(s.rough), change: (a, b) => a.rough - b.rough, show: pts, good: -1, flat: 0.005 },
  { label: 'Avg set', value: (s) => long(s.seconds), change: (a, b) => a.seconds - b.seconds, show: (d) => `${d > 0 ? '+' : '−'}${long(Math.abs(d))}`, good: 0, flat: 15 },
]

function Change({ tile, form }: { tile: Tile; form: Form }) {
  const d = form.before ? tile.change(form.now, form.before) : null
  if (d === null) return <p className="mt-1 text-sm text-faint">Needs {form.size * 2} shows to compare</p>
  if (Math.abs(d) < tile.flat) return <p className="mt-1 flex items-center gap-1 text-sm text-dim"><Minus size={14} />Same as before</p>
  const tone = tile.good === 0 ? 'text-dim' : Math.sign(d) === tile.good ? 'text-ok' : 'text-light'
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight
  return <p className={`mt-1 flex items-center gap-1 text-sm ${tone}`}><Icon size={16} />{tile.show(d)}</p>
}

export function FormTiles({ form }: { form: Form }) {
  return (
    <section className="rounded-2xl border border-rule bg-ink-2 p-4 sm:p-5">
      <h3 className="text-base font-semibold">Recent form</h3>
      <p className="mt-0.5 text-sm text-dim">
        Your last {form.size} shows{form.before ? `, against the ${form.size} before them` : ''}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        {TILES.map((t) => (
          <div key={t.label} className="min-w-0">
            <dt className="text-sm text-dim">{t.label}</dt>
            <dd className="headline mt-1 text-[32px]">{t.value(form.now)}</dd>
            <dd><Change tile={t} form={form} /></dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
