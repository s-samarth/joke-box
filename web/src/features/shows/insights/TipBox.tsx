/** The floating readout above a hovered or focused mark. Value first, details after. */
import type { Tip } from './useTip'

export function TipBox({ tip }: { tip: Tip | null }) {
  if (!tip) return null
  return (
    <div role="tooltip" className="pointer-events-none absolute z-20 w-max max-w-[220px] -translate-x-1/2 -translate-y-full rounded-lg border border-rule-strong bg-ink px-3 py-2 text-sm shadow-lift"
      style={{ left: tip.x, top: tip.y - 8 }}>
      <p className="font-semibold text-paper">{tip.title}</p>
      {tip.lines.map((line) => <p key={line} className="text-dim">{line}</p>)}
    </div>
  )
}

/** A titled block for one chart, with a line saying how to read it. */
export function ChartCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-rule bg-ink-2 p-4 sm:p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      {note && <p className="mt-0.5 text-sm text-dim">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
