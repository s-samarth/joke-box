/**
 * Alternate punches: other endings for the same setup, kept under the punchline in use so trying
 * a new one never costs the old one. They sit between the punchline and the tag lines, on the
 * joke's page and in New joke.
 *
 * "Use" swaps one in (swapPunch): it becomes the punchline and the punchline it replaced takes
 * its row, so nothing is lost and Use on that row swaps them back.
 */
import { ArrowUp, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { GrowingText } from '../../components/ui/Field'
import { swapPunch } from './punch'

interface Props {
  punchline: string
  alternates: string[]
  onChange: (patch: { punchline?: string; alt_punchlines: string[] }) => void
}

export function PunchAlternates({ punchline, alternates, onChange }: Props) {
  // The row made by the Add button takes the cursor, so you can type straight away.
  const [added, setAdded] = useState<number | null>(null)
  const set = (alt_punchlines: string[]) => onChange({ alt_punchlines })
  const add = () => {
    setAdded(alternates.length)
    set([...alternates, ''])
  }
  const remove = (i: number) => {
    setAdded(null)
    set(alternates.filter((_, n) => n !== i))
  }
  const quiet = 'hit relative inline-flex h-8 shrink-0 items-center justify-center rounded-md text-faint hover:text-paper'

  return (
    <div className="space-y-2">
      {alternates.length > 0 && (
        <ul aria-label="Alternate punches" className="space-y-2 border-l-2 border-rule pl-3">
          {alternates.map((text, i) => (
            <li key={i} className="flex items-start gap-2">
              <GrowingText autoFocus={i === added} aria-label={`Alternate punch ${i + 1}`} placeholder="Or it ends like this…" className="text-lg leading-snug text-dim" value={text}
                onChange={(e) => set(alternates.map((a, n) => (n === i ? e.target.value : a)))} />
              <button type="button" disabled={!text.trim()} title="Make this the punchline. The current one moves down here." aria-label={`Use alternate punch ${i + 1} as the punchline`}
                onClick={() => { setAdded(null); onChange(swapPunch(punchline, alternates, i)) }} className={`${quiet} gap-1 px-2 text-sm hover:text-tape disabled:pointer-events-none disabled:opacity-40`}>
                <ArrowUp size={14} /> Use
              </button>
              <button type="button" aria-label={`Remove alternate punch ${i + 1}`} onClick={() => remove(i)} className={`${quiet} size-8`}>
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={add} className="inline-flex h-9 items-center gap-1.5 text-[15px] text-faint hover:text-tape">
        <Plus size={16} /> Add an alternate punch
      </button>
    </div>
  )
}
