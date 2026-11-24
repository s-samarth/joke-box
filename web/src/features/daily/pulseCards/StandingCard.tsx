/**
 * Where everything stands: one bar per kind split by status (observations by whether anything
 * came of them), each part counted underneath. Draft is grey, Testing periwinkle, Stage Ready
 * green and Discarded a faded red; any other joke status of yours takes a shade of paper.
 */
import type { Standing } from '../pulse'
import { cap } from './format'
import { PulseCard } from './PulseCard'

const KNOWN: Record<string, string> = {
  draft: 'bg-faint',
  testing: 'bg-sky',
  'stage ready': 'bg-ok',
  discarded: 'bg-light/60',
  'led somewhere': 'bg-orchid',
  unused: 'bg-faint',
}
const OTHERS = ['bg-paper/60', 'bg-paper/35', 'bg-paper/80', 'bg-paper/20']

function colours(labels: string[]): string[] {
  let other = 0
  return labels.map((l) => KNOWN[l.toLowerCase()] ?? OTHERS[other++ % OTHERS.length])
}

function Row({ kind, parts }: Standing) {
  const total = parts.reduce((s, p) => s + p.count, 0)
  const tone = colours(parts.map((p) => p.label))
  const shown = parts.map((p, i) => ({ ...p, tone: tone[i] })).filter((p) => p.count > 0 || kind === 'premises')
  return (
    <div>
      <div className="flex items-baseline justify-between text-[15px]">
        <span className="font-semibold">{cap(kind)}</span>
        <span className="text-sm text-dim tabular">{total}</span>
      </div>
      <div className="mt-1.5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-ink-3" aria-hidden>
        {shown.filter((p) => p.count).map((p) => <span key={p.label} className={p.tone} style={{ flexGrow: p.count }} />)}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-dim">
        {shown.map((p) => (
          <li key={p.label} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${p.tone}`} aria-hidden />
            <b className="font-semibold text-paper tabular">{p.count}</b> {p.label.toLowerCase()}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StandingCard({ standing }: { standing: Standing[] }) {
  return (
    <PulseCard title="Where everything stands">
      <div className="space-y-4">{standing.map((s) => <Row key={s.kind} {...s} />)}</div>
    </PulseCard>
  )
}
