/**
 * "Notes": a box of its own for anything else about a premise or an observation, empty until you
 * write in it. A heading like the sections under it ("Jokes on it", "Jokes from it"), so it reads
 * as part of the page, not the form above. Grows with what's written, so it never scrolls inside.
 */
import { useId } from 'react'
import { GrowingText } from './Field'

export function NotesBox({ value, onChange, placeholder = 'Anything else worth keeping' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="headline mb-3 text-2xl">Notes</h2>
      {/* The box is drawn around the text, since the growing text draws no box of its own. */}
      <div className="rounded-lg bg-ink-2 px-3 py-2.5 ring-1 ring-rule-strong transition focus-within:ring-2 focus-within:ring-tape">
        <GrowingText aria-labelledby={id} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
          className="min-h-20 text-[16px] leading-relaxed break-words sm:text-[15px]" />
      </div>
    </section>
  )
}
