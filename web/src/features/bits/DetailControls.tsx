/** The small editors on a bit's page: strength, types, clean rating and hashtags. */
import { Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useTypes } from '../../api/library'
import type { CleanRating } from '../../api/types'
import { useTypeColor } from '../../api/typeColors'
import { CLEAN_LABELS, DEFAULT_TYPES, STRENGTH_LABELS } from '../../lib/bitMeta'
import { NewTypeDialog } from './NewTypeDialog'

const choice = (on: boolean) =>
  `h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`

export function StrengthPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Strength">
      <div className="flex items-end gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={STRENGTH_LABELS[n - 1]} onClick={() => onChange(n)}
            className="flex h-9 w-7 items-end justify-center rounded-md pb-1.5 hover:bg-ink-3">
            <span className={`w-2 rounded-[2px] ${n <= value ? 'bg-tape' : 'bg-ink-4'}`} style={{ height: `${8 + n * 3}px` }} />
          </button>
        ))}
      </div>
      <span className="text-sm text-dim">{STRENGTH_LABELS[value - 1]}</span>
    </div>
  )
}

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
