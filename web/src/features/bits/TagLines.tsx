/** Comedy tags: extra punchlines after the main punch, added and removed one line at a time. */
import { Plus, X } from 'lucide-react'
import { GrowingText } from '../../components/ui/Field'

export function TagLines({ lines, onChange }: { lines: string[]; onChange: (l: string[]) => void }) {
  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="group flex items-start gap-3">
          <span className="mt-1 text-tape" aria-hidden>+</span>
          <GrowingText aria-label={`Tag line ${i + 1}`} placeholder="And another thing…" className="text-lg leading-snug text-dim" value={line}
            onChange={(e) => onChange(lines.map((l, n) => (n === i ? e.target.value : l)))} />
          <button type="button" aria-label="Remove tag line" onClick={() => onChange(lines.filter((_, n) => n !== i))} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-faint hover:text-paper sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
            <X size={15} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...lines, ''])} className="inline-flex h-9 items-center gap-1.5 text-[15px] text-faint hover:text-tape">
        <Plus size={16} /> Add a tag line
      </button>
    </div>
  )
}
