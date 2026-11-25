/**
 * How a set is built, in four steps, at the top of Sets: the point, the spine, inside a beat, and
 * gates (docs/sets.md). Hide it once you know it; "How sets work" in the header still opens the
 * whole guide. On a phone it's one line that opens the guide.
 */
import { ChevronRight, X } from 'lucide-react'

const STEPS = [
  { n: 1, title: 'The point', text: 'One sentence the room should leave thinking.', tone: 'text-tape' },
  { n: 2, title: 'The spine', text: 'Beats in a fixed order. You memorise one cue word each.', tone: 'text-tape' },
  { n: 3, title: 'Inside a beat', text: 'Premises, jokes and crowd work. Yellow is locked, teal is loose.', tone: 'text-teal' },
  { n: 4, title: 'Gates', text: "If a gate joke doesn't land, skip what it guards.", tone: 'text-sky' },
]

export function SetsGuideStrip({ onOpen, onHide }: { onOpen: () => void; onHide: () => void }) {
  const hide = (
    <button type="button" onClick={onHide} aria-label="Hide these steps" title="Hide these steps"
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-dim hover:bg-ink-3 hover:text-paper"><X size={16} /></button>
  )
  return (
    <section aria-label="How a set is built" className="mb-5">
      <div className="flex items-center gap-1 rounded-xl bg-ink-2/60 ring-1 ring-rule sm:hidden">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3.5 text-left">
          <span className="flex gap-1" aria-hidden><span className="h-6 w-2 rounded-sm bg-tape" /><span className="h-6 w-2 rounded-sm bg-teal" /><span className="h-6 w-2 rounded-sm bg-sky" /></span>
          <span className="min-w-0 flex-1 text-sm leading-snug"><b>How sets work</b><br /><span className="text-dim">Point, spine, beats, gates.</span></span>
          <ChevronRight size={16} className="text-dim" />
        </button>
        {hide}
      </div>
      <div className="relative hidden gap-4 rounded-2xl bg-ink-2/60 p-4 pr-14 ring-1 ring-rule sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="flex gap-2.5">
            <span className={`headline text-[30px] ${s.tone}`} aria-hidden>{s.n}</span>
            <div>
              <p className="text-[15px] font-bold">{s.title}</p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-dim">{s.text}</p>
            </div>
          </div>
        ))}
        <div className="absolute top-2 right-2">{hide}</div>
      </div>
    </section>
  )
}
