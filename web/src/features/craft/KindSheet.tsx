/**
 * Make or change a kind of note: its name and how it behaves. Deleting one moves its notes to
 * another kind you pick. Renaming never loses anything: notes point at the kind, not its name.
 */
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useCreateKind, useDeleteKind, useUpdateKind } from '../../api/craft'
import type { NoteKind, NoteKindInput } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useFeedback } from '../../components/ui/feedbackContext'
import { BEHAVIOURS } from './craftMeta'
import { KIND_ICONS } from './kindIcons'

interface Props {
  kind?: NoteKind
  kinds: NoteKind[]
  noteCount: number
  onClose: () => void
  onCreated?: (kind: NoteKind) => void
}

export function KindSheet({ kind, kinds, noteCount, onClose, onCreated }: Props) {
  const [form, setForm] = useState<NoteKindInput>(kind ? { name: kind.name, behaviour: kind.behaviour } : { name: '', behaviour: 'reference' })
  const others = kinds.filter((k) => k.id !== kind?.id)
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? '')
  const create = useCreateKind()
  const update = useUpdateKind()
  const del = useDeleteKind()
  const { confirm, toast } = useFeedback()

  const save = () => {
    const input = { ...form, name: form.name.trim() }
    if (!input.name) return
    const onError = (e: Error) => toast(e.message)
    if (kind) update.mutate({ id: kind.id, input }, { onSuccess: () => { toast('Kind saved'); onClose() }, onError })
    else create.mutate(input, { onSuccess: (made) => { toast(`${made.name} added`); onCreated?.(made); onClose() }, onError })
  }
  const remove = async () => {
    if (!kind) return
    const target = others.find((k) => k.id === moveTo)
    const message = noteCount && target ? `Its ${noteCount === 1 ? 'note becomes' : `${noteCount} notes become`} ${target.name}.` : 'No notes use it.'
    if (!(await confirm({ title: `Delete ${kind.name}?`, message, confirmLabel: 'Delete kind', danger: true }))) return
    del.mutate({ id: kind.id, moveTo }, { onSuccess: () => { toast(`${kind.name} deleted`); onClose() }, onError: (e) => toast(e.message) })
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={kind ? 'Edit kind' : 'New kind'}
      footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="tape" onClick={save} disabled={!form.name.trim() || create.isPending || update.isPending}>{kind ? 'Save kind' : 'Add kind'}</Button></>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save() }}>
        <Field label="Name"><Input value={form.name} maxLength={60} placeholder="e.g. Exercise, Quote, Joke breakdown" onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm text-dim">Works like</legend>
          {BEHAVIOURS.map((b) => {
            const Icon = KIND_ICONS[b.key]
            const on = form.behaviour === b.key
            return (
              <label key={b.key} className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition ${on ? 'bg-ink-3 ring-paper/40' : 'ring-rule hover:bg-ink-3'}`}>
                <input type="radio" name="behaviour" className="sr-only" checked={on} onChange={() => setForm({ ...form, behaviour: b.key })} />
                <Icon size={18} className={`mt-0.5 shrink-0 ${on ? 'text-tape' : 'text-dim'}`} aria-hidden />
                <span><span className="block font-medium">{b.label}</span><span className="block text-sm text-faint">{b.hint}</span></span>
              </label>
            )
          })}
        </fieldset>
        {kind && others.length > 0 && (
          <div className="space-y-2 border-t border-rule pt-5">
            {noteCount > 0 && (
              <Field label="When deleting, make its notes">
                <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>{others.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</Select>
              </Field>
            )}
            <Button variant="danger" small icon={<Trash2 size={15} />} onClick={() => void remove()}>Delete kind</Button>
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
