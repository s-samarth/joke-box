/** The small editors on a joke's page: types, clean rating and hashtags. Strength: components/ui/StrengthPicker. */
import { Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useTypes } from '../../api/library'
import type { CleanRating } from '../../api/types'
import { useTypeColor } from '../../api/typeColors'
import { CLEAN_LABELS, DEFAULT_TYPES } from '../../lib/jokeMeta'
import { choice } from '../../components/ui/choice'
import { NewTypeDialog } from './NewTypeDialog'

export function TypeToggles({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { data: types = [] } = useTypes()
  const colorOf = useTypeColor()
  const [adding, setAdding] = useState(false)
  const has = (n: string) => value.some((v) => v.toLowerCase() === n.toLowerCase())
  const options = [...DEFAULT_TYPES]
  for (const n of [...types.map((t) => t.name), ...value]) if (!options.some((o) => o.toLowerCase() === n.toLowerCase())) options.push(n)
  const toggle = (n: string) => onChange(has(n) ? value.filter((v) => v.toLowerCase() !== n.toLowerCase()) : [...value, n])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((n) => (
        <button key={n} type="button" aria-pressed={has(n)} onClick={() => toggle(n)} className={`${choice(has(n))} inline-flex items-center gap-2`}>
          <span className="size-1.5 rounded-full" style={{ backgroundColor: colorOf(n) }} aria-hidden />{n}
        </button>
      ))}
      <button type="button" onClick={() => setAdding(true)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-tape hover:bg-ink-3"><Plus size={15} />Other</button>
      <NewTypeDialog open={adding} onClose={() => setAdding(false)} onAdd={(n) => !has(n) && onChange([...value, n])} />
    </div>
  )
}

export function CleanPicker({ value, onChange }: { value: CleanRating | null; onChange: (v: CleanRating | null) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Clean rating">
      {(Object.keys(CLEAN_LABELS) as CleanRating[]).map((k) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(value === k ? null : k)} className={choice(value === k)}>
          {CLEAN_LABELS[k]}
        </button>
      ))}
    </div>
  )
}

export function HashtagField({ value, onChange, suggestions }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState('')
  const listId = useId()
  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#?/, '#')
    if (tag.length > 1 && !value.includes(tag)) onChange([...value, tag])
    setText('')
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((tag) => (
        <span key={tag} className="inline-flex h-8 items-center gap-1 rounded-lg bg-ink-3 pr-1 pl-2.5 text-sm text-dim">
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))} className="inline-flex size-6 items-center justify-center rounded-md hover:bg-ink-4"><X size={13} /></button>
        </span>
      ))}
      <input list={listId} value={text} placeholder="#add" aria-label="Add hashtag" onChange={(e) => setText(e.target.value)} onBlur={() => text && add(text)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text) } }}
        className="h-8 w-28 rounded-lg bg-transparent px-2 text-[16px] text-paper placeholder:text-faint outline-none focus:bg-ink-3 sm:text-sm" />
      <datalist id={listId}>{suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}</datalist>
    </div>
  )
}
