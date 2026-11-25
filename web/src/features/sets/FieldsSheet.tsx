/**
 * Your label fields: add, rename and delete fields and their options. One field can be drawn as
 * the status track (its options say win, neutral or loss, which the checks read), and one can
 * be the persona the persona check counts. Not sure is always there and can't be removed.
 * Deleting an option turns the beats that had it into Not sure. Saved for every set on Done.
 */
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { newId } from '../../api/client'
import { useSaveSetFields, useSetFields } from '../../api/setFields'
import type { SetField, SetFields, StatusGroup } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { NOT_SURE } from './beats'

const GROUPS: StatusGroup[] = ['win', 'neutral', 'loss']

function FieldCard({ field, onChange, onDelete, roleTaken }: { field: SetField; onChange: (f: SetField) => void; onDelete: () => void; roleTaken: (r: 'status' | 'persona') => boolean }) {
  const [adding, setAdding] = useState('')
  const add = () => {
    const label = adding.trim()
    if (!label || label === NOT_SURE || field.options.some((o) => o.label === label)) return
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
        <option value="persona" disabled={field.role !== 'persona' && roleTaken('persona')}>Counted by the persona check</option>
      </Select>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {field.options.map((o) => (
          <li key={o.id} className="inline-flex items-center gap-1 rounded-full bg-ink-3 py-0.5 pr-1 pl-2.5 text-sm">
            {o.label}
            {field.role === 'status' && (
              <select aria-label={`What ${o.label} counts as`} value={o.group ?? 'neutral'} className="rounded bg-ink-4 px-1 text-xs text-dim"
                onChange={(e) => onChange({ ...field, options: field.options.map((x) => (x.id === o.id ? { ...x, group: e.target.value as StatusGroup } : x)) })}>
                {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
            <button type="button" aria-label={`Remove ${o.label}`} className="inline-flex size-6 items-center justify-center rounded-full text-faint hover:text-paper"
              onClick={() => onChange({ ...field, options: field.options.filter((x) => x.id !== o.id) })}><X size={13} /></button>
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

export function FieldsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const saved = useSetFields()
  const save = useSaveSetFields()
  const [draft, setDraft] = useState<SetFields | null>(null)
  const current = draft ?? saved
  const set = (fields: SetField[]) => setDraft({ ...current, fields })
  const close = (next: boolean) => {
    if (!next && draft) save.mutate({ ...draft, fields: draft.fields.map((f) => ({ ...f, name: f.name.trim() || 'Untitled field' })) })
    if (!next) setDraft(null)
    onOpenChange(next)
  }
  return (
    <Modal open={open} onOpenChange={close} wide title="Label fields" description="The labels every beat can have, in every set. Not sure is always there."
      footer={<Button variant="tape" onClick={() => close(false)}>Done</Button>}>
      <ul className="space-y-3">
        {current.fields.map((f) => (
          <FieldCard key={f.id} field={f} roleTaken={(r) => current.fields.some((x) => x.role === r)}
            onChange={(next) => set(current.fields.map((x) => (x.id === f.id ? next : x)))}
            onDelete={() => set(current.fields.filter((x) => x.id !== f.id))} />
        ))}
      </ul>
      <Button className="mt-3" icon={<Plus size={16} />} onClick={() => set([...current.fields, { id: newId(), name: 'New field', role: null, options: [] }])}>New field</Button>
    </Modal>
  )
}
