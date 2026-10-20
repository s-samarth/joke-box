/** Hashtags (chips with autocomplete) and tag lines (extra punchlines). */
import { Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Input, Textarea } from '../../../components/ui/Field'

export function HashtagInput({ value, onChange, suggestions }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState('')
  const listId = useId()
  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#?/, '#')
    if (tag.length > 1 && !value.includes(tag)) onChange([...value, tag])
    setText('')
  }
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span key={tag} className="inline-flex h-8 items-center gap-1 rounded-full bg-raised pr-1 pl-3 text-sm text-muted ring-1 ring-line">
              {tag}
              <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))} className="inline-flex size-6 items-center justify-center rounded-full hover:bg-white/10">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        list={listId}
        placeholder="#dating — press Enter to add"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text && add(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(text)
          }
        }}
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  )
}

/** A list of extra punchlines that follow the main one ("tags" in stand-up). */
export function TagLinesInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const update = (i: number, text: string) => onChange(value.map((v, n) => (n === i ? text : v)))
  return (
    <div className="space-y-2">
      {value.map((line, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 w-5 shrink-0 text-right text-xs text-faint tabular">{i + 1}.</span>
          <Textarea className="min-h-11" rows={1} value={line} placeholder="And another thing…" onChange={(e) => update(i, e.target.value)} />
          <button type="button" aria-label="Remove tag line" onClick={() => onChange(value.filter((_, n) => n !== i))} className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-faint hover:bg-white/5 hover:text-text">
            <X size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, ''])} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-sm text-accent hover:bg-accent-soft">
        <Plus size={16} /> Add tag line
      </button>
    </div>
  )
}
