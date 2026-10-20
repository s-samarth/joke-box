import { Check, Plus } from 'lucide-react'
import { useTypes } from '../../../api/library'
import { useFeedback } from '../../../components/ui/feedbackContext'
import { DEFAULT_TYPES, typeStyle } from '../../../lib/bitMeta'

/** Multi-select type chips: the seven defaults plus any you've made, and "+ New type". */
export function TypePicker({ value, onChange }: { value: string[]; onChange: (types: string[]) => void }) {
  const { data: types = [] } = useTypes()
  const { prompt } = useFeedback()
  const lower = new Set(value.map((v) => v.toLowerCase()))
  const options = [...DEFAULT_TYPES]
  for (const name of [...types.map((t) => t.name), ...value]) {
    if (!options.some((o) => o.toLowerCase() === name.toLowerCase())) options.push(name)
  }

  const toggle = (name: string) =>
    onChange(lower.has(name.toLowerCase()) ? value.filter((v) => v.toLowerCase() !== name.toLowerCase()) : [...value, name])

  const addNew = async () => {
    const name = await prompt({ title: 'New type', label: 'e.g. Callback', confirmLabel: 'Add' })
    if (name && !lower.has(name.toLowerCase())) onChange([...value, name])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((name) => {
        const on = lower.has(name.toLowerCase())
        return (
          <button
            key={name}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(name)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm ring-1 transition ${on ? typeStyle(name) : 'bg-transparent text-faint ring-line hover:text-muted'}`}
          >
            {on && <Check size={14} />}
            {name}
          </button>
        )
      })}
      <button type="button" onClick={addNew} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm text-accent ring-1 ring-accent/30 hover:bg-accent-soft">
        <Plus size={14} /> New type
      </button>
    </div>
  )
}
