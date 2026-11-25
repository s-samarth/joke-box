/** The small editors on a joke's page: types, clean rating, vibe, generic and hashtags. Strength: components/ui/StrengthPicker. */
import { Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useTypes } from '../../api/library'
import type { CleanRating, SetField } from '../../api/types'
import { useTypeColor } from '../../api/typeColors'
import { CLEAN_LABELS, DEFAULT_TYPES } from '../../lib/jokeMeta'
import { choice } from '../../components/ui/choice'
import { NewTypeDialog } from './NewTypeDialog'
import { GENERIC_ASK, NOT_SURE, VIBE } from './persona'
import { VibeDot } from './VibeDot'
import { genericTone, useVibeTone } from './vibeTone'

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

const vibeChoice = (on: boolean) => `hit relative inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition ${on ? 'font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`

/** Its vibe: the side of you it shows, from your persona field's options. Not sure is always there. */
export function PersonaPicker({ field, value, onChange }: { field: SetField; value: string | null; onChange: (v: string | null) => void }) {
  const current = field.options.some((o) => o.id === value) ? value : null
  const tone = useVibeTone()
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={VIBE}>
      {field.options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={current === o.id} onClick={() => onChange(o.id)} className={vibeChoice(current === o.id)} style={current === o.id ? tone(o.id).on : undefined}><VibeDot id={o.id} />{o.label}</button>
      ))}
      <button type="button" role="radio" aria-checked={!current} onClick={() => onChange(null)} className={vibeChoice(!current)} style={!current ? tone(null).on : undefined}><VibeDot id={null} />{NOT_SURE}</button>
    </div>
  )
}

const genericChoice = (g: boolean, on: boolean) =>
  `hit relative h-9 rounded-lg px-3 text-sm transition ${on ? genericTone(g).on : 'bg-ink-3 text-dim hover:text-paper'}`

/** Generic (anyone could do it) or not. Unanswered, it says so in amber until you pick. */
export function GenericPicker({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Generic">
      <button type="button" role="radio" aria-checked={value === true} onClick={() => onChange(true)} className={genericChoice(true, value === true)}>Generic</button>
      <button type="button" role="radio" aria-checked={value === false} onClick={() => onChange(false)} className={genericChoice(false, value === false)}>Non-generic</button>
      {value == null && <span className="text-sm text-amber">{GENERIC_ASK} Pick one</span>}
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
