/**
 * Your label fields: add, rename and delete fields and their options (tap an option to rename
 * it). One field can be drawn as the status track (its options say win, neutral or loss, which
 * the checks read), and one can be the persona: the persona check counts it, and a joke's persona
 * picks from it. Not sure is always there and can't be removed. Deleting an option, or a field,
 * says first how many beats and jokes it's on: they turn to Not sure. Saved for every set on Done.
 */
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { newId } from '../../api/client'
import { useJokes } from '../../api/library'
import { useSaveSetFields, useSetFields } from '../../api/setFields'
import { useSetlists } from '../../api/shows'
import type { Beat, SetField, SetFieldOption, SetFields, StatusGroup } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useFeedback } from '../../components/ui/feedbackContext'
import { NOT_SURE } from './beats'
import { optionUsage, usageText } from './fieldUsage'

const GROUPS: StatusGroup[] = ['win', 'neutral', 'loss']
const MAX_OPTIONS = 40 // the server's limit
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

interface CardProps {
  field: SetField
  onChange: (f: SetField) => void
  onDelete: () => void
  onRemoveOption: (o: SetFieldOption) => void
  onRenameOption: (o: SetFieldOption) => void
  roleTaken: (r: 'status' | 'persona') => boolean
}

function FieldCard({ field, onChange, onDelete, onRemoveOption, onRenameOption, roleTaken }: CardProps) {
  const [adding, setAdding] = useState('')
  const add = () => {
    const label = adding.trim()
    if (!label || same(label, NOT_SURE) || field.options.length >= MAX_OPTIONS || field.options.some((o) => same(o.label, label))) return
    onChange({ ...field, options: [...field.options, { id: newId(), label, group: field.role === 'status' ? 'neutral' : null }] })
    setAdding('')
  }
  return (
    <li className="rounded-xl bg-ink p-3 ring-1 ring-rule">
      <div className="flex gap-2">
        <Input aria-label="Field name" value={field.name} maxLength={80} onChange={(e) => onChange({ ...field, name: e.target.value })} />
        <Button variant="danger" small onClick={onDelete}>Delete</Button>
      </div>
      <Select aria-label="What this field is for" className="mt-2" value={field.role ?? ''}
        onChange={(e) => { const role = (e.target.value || null) as SetField['role']; onChange({ ...field, role, options: field.options.map((o) => ({ ...o, group: role === 'status' ? (o.group ?? 'neutral') : null })) }) }}>
        <option value="">A plain label</option>
        <option value="status" disabled={field.role !== 'status' && roleTaken('status')}>Drawn as the status track</option>
        <option value="persona" disabled={field.role !== 'persona' && roleTaken('persona')}>The persona (checked across a set, and picked on each joke)</option>
      </Select>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {field.options.map((o) => (
          <li key={o.id} className="inline-flex items-center gap-1 rounded-full bg-ink-3 py-0.5 pr-1 pl-1 text-sm">
            <button type="button" aria-label={`Rename ${o.label}`} title="Rename" className="rounded-full px-1.5 py-0.5 hover:bg-ink-4" onClick={() => onRenameOption(o)}>{o.label}</button>
            {field.role === 'status' && (
              <select aria-label={`What ${o.label} counts as`} value={o.group ?? 'neutral'} className="rounded bg-ink-4 px-1 text-xs text-dim"
                onChange={(e) => onChange({ ...field, options: field.options.map((x) => (x.id === o.id ? { ...x, group: e.target.value as StatusGroup } : x)) })}>
                {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
            <button type="button" aria-label={`Delete ${o.label}`} className="inline-flex size-6 items-center justify-center rounded-full text-faint hover:text-paper"
              onClick={() => onRemoveOption(o)}><X size={13} /></button>
          </li>
        ))}
        <li className="rounded-full px-2.5 py-0.5 text-sm text-faint ring-1 ring-rule">{NOT_SURE}</li>
      </ul>
      <div className="mt-2 flex gap-2">
        <Input aria-label={`New option for ${field.name}`} placeholder="New option" value={adding} maxLength={80} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <Button small onClick={add}>Add</Button>
      </div>
      {field.role === 'status' && <p className="mt-2 text-xs text-faint">Win, neutral or loss tells the checks what each option means. A loss is a humility top-up.</p>}
    </li>
  )
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The set being edited, with its beats as they are now (its save may still be on the way). */
  current?: { id: string; beats: Beat[] }
}

export function FieldsSheet({ open, onOpenChange, current: editing }: Props) {
  const saved = useSetFields()
  const save = useSaveSetFields()
  const { data: setlists = [] } = useSetlists()
  const { data: jokes = [] } = useJokes()
  const { confirm, prompt } = useFeedback()
  const [draft, setDraft] = useState<SetFields | null>(null)
  const current = draft ?? saved
  const set = (fields: SetField[]) => setDraft({ ...current, fields })
  const change = (next: SetField) => set(current.fields.map((x) => (x.id === next.id ? next : x)))
  const sets = editing ? [...setlists.filter((s) => s.id !== editing.id), editing] : setlists
  const usage = (f: SetField, ids: string[]) => usageText(optionUsage(f, ids, sets, jokes))

  const removeOption = async (f: SetField, o: SetFieldOption) => {
    const used = usage(f, [o.id])
    if (used && !(await confirm({ title: `Delete ${o.label}?`, message: `${o.label} is on ${used}. They'll be ${NOT_SURE}.`, confirmLabel: `Delete ${o.label}`, danger: true }))) return
    change({ ...f, options: f.options.filter((x) => x.id !== o.id) })
  }
  // Renaming keeps the option's id, so every beat and joke that has it shows the new name.
  const renameOption = async (f: SetField, o: SetFieldOption) => {
    const name = (await prompt({ title: `Rename ${o.label}`, initial: o.label, confirmLabel: 'Rename' }))?.trim().slice(0, 80)
    if (!name || name === o.label || same(name, NOT_SURE) || f.options.some((x) => x.id !== o.id && same(x.label, name))) return
    change({ ...f, options: f.options.map((x) => (x.id === o.id ? { ...x, label: name } : x)) })
  }
  const removeField = async (f: SetField) => {
    const used = usage(f, f.options.map((o) => o.id))
    const role = f.role === 'status' ? ' The status track and its checks go with it.' : f.role === 'persona' ? ' The persona check and the persona on jokes go with it.' : ''
    if ((used || role) && !(await confirm({ title: `Delete ${f.name}?`, message: `${used ? `Its labels are on ${used}.` : ''}${role}`.trim(), confirmLabel: 'Delete field', danger: true }))) return
    set(current.fields.filter((x) => x.id !== f.id))
  }
  const close = (next: boolean) => {
    if (!next && draft) save.mutate({ ...draft, fields: draft.fields.map((f) => ({ ...f, name: f.name.trim() || 'Untitled field' })) })
    if (!next) setDraft(null)
    onOpenChange(next)
  }
  return (
    <Modal open={open} onOpenChange={close} wide title="Label fields" description="The labels every beat can have, in every set. Tap an option to rename it. Not sure is always there."
      footer={<Button variant="tape" onClick={() => close(false)}>Done</Button>}>
      <ul className="space-y-3">
        {current.fields.map((f) => (
          <FieldCard key={f.id} field={f} roleTaken={(r) => current.fields.some((x) => x.role === r)} onChange={change}
            onDelete={() => void removeField(f)} onRemoveOption={(o) => void removeOption(f, o)} onRenameOption={(o) => void renameOption(f, o)} />
        ))}
      </ul>
      <Button className="mt-3" icon={<Plus size={16} />} disabled={current.fields.length >= 30} onClick={() => set([...current.fields, { id: newId(), name: 'New field', role: null, options: [] }])}>New field</Button>
    </Modal>
  )
}
