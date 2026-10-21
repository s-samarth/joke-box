/**
 * Make or change an area: its name, a line about it, its colour, and which screens show its
 * notes. Deleting one moves its notes to another area you pick, so nothing is lost.
 */
import { Check, Pipette, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useCreateArea, useDeleteArea, useUpdateArea } from '../../api/craft'
import type { CraftArea, CraftAreaInput, CraftScreen } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useFeedback } from '../../components/ui/feedbackContext'
import { AREA_COLORS, SCREENS, areaColor, nextColor } from './craftMeta'

const chip = (on: boolean) => `h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`

interface Props {
  area?: CraftArea
  areas: CraftArea[]
  noteCount: number
  onClose: () => void
  onDeleted?: (movedTo: string) => void
  onCreated?: (area: CraftArea) => void
}

export function AreaSheet({ area, areas, noteCount, onClose, onDeleted, onCreated }: Props) {
  const [form, setForm] = useState<CraftAreaInput>(area ? { name: area.name, description: area.description, color: area.color, screens: area.screens } : { name: '', description: '', color: nextColor(areas), screens: [] })
  const others = areas.filter((a) => a.id !== area?.id)
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? '')
  const create = useCreateArea()
  const update = useUpdateArea()
  const del = useDeleteArea()
  const { confirm, toast } = useFeedback()
  const set = (patch: Partial<CraftAreaInput>) => setForm((f) => ({ ...f, ...patch }))
  const toggleScreen = (s: CraftScreen) => set({ screens: form.screens.includes(s) ? form.screens.filter((x) => x !== s) : [...form.screens, s] })

  const save = () => {
    const input = { ...form, name: form.name.trim(), description: form.description.trim() }
    if (!input.name) return
    const onError = (e: Error) => toast(e.message)
    if (area) update.mutate({ id: area.id, input }, { onSuccess: () => { toast('Area saved'); onClose() }, onError })
    else create.mutate(input, { onSuccess: (made) => { toast(`${made.name} added`); onCreated?.(made); onClose() }, onError })
  }
  const remove = async () => {
    if (!area) return
    const target = others.find((a) => a.id === moveTo)
    const message = noteCount && target ? `Its ${noteCount === 1 ? 'note moves' : `${noteCount} notes move`} to ${target.name}.` : 'It has no notes.'
    if (!(await confirm({ title: `Delete ${area.name}?`, message, confirmLabel: 'Delete area', danger: true }))) return
    del.mutate({ id: area.id, moveTo }, { onSuccess: () => { toast(`${area.name} deleted`); onClose(); onDeleted?.(moveTo) }, onError: (e) => toast(e.message) })
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={area ? 'Edit area' : 'New area'}
      footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="tape" onClick={save} disabled={!form.name.trim() || create.isPending || update.isPending}>{area ? 'Save area' : 'Add area'}</Button></>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save() }}>
        <Field label="Name"><Input value={form.name} maxLength={80} placeholder="e.g. Callbacks" onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="What goes here (optional)"><Input value={form.description} maxLength={200} placeholder="One line about it" onChange={(e) => set({ description: e.target.value })} /></Field>
        <div className="space-y-2">
          <span className="text-sm text-dim">Colour <span className="text-faint">(colours can repeat; there is no limit on areas)</span></span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
            {Object.keys(AREA_COLORS).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={form.color === c} aria-label={c} onClick={() => set({ color: c })}
                className="inline-flex size-10 items-center justify-center rounded-full ring-offset-2 ring-offset-ink-2 transition aria-checked:ring-2 aria-checked:ring-paper" style={{ background: AREA_COLORS[c] }}>
                {form.color === c && <Check size={16} className="text-ink" strokeWidth={3} />}
              </button>
            ))}
            {/* Any colour you like: the native colour picker, behind a round swatch like the rest. */}
            <label className={`relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-ink-2 ${form.color.startsWith('#') ? 'ring-2 ring-paper' : 'ring-1 ring-rule-strong'}`}
              style={form.color.startsWith('#') ? { background: form.color } : undefined} title="Pick any colour">
              <Pipette size={16} className={form.color.startsWith('#') ? 'text-ink' : 'text-dim'} aria-hidden />
              <input type="color" aria-label="Pick any colour" className="absolute inset-0 cursor-pointer opacity-0" value={areaColor(form.color)} onChange={(e) => set({ color: e.target.value })} />
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-sm text-dim">Show its notes on</span>
          <div className="flex flex-wrap gap-2">
            {SCREENS.map((s) => <button key={s.key} type="button" aria-pressed={form.screens.includes(s.key)} className={chip(form.screens.includes(s.key))} onClick={() => toggleScreen(s.key)}>{s.label}</button>)}
          </div>
          <p className="text-xs text-faint">Rewrite shows checklists; the set builder and Stage show everything in the area.</p>
        </div>
        {area && others.length > 0 && (
          <div className="space-y-2 border-t border-rule pt-5">
            {noteCount > 0 && (
              <Field label="When deleting, move its notes to">
                <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>{others.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
              </Field>
            )}
            <Button variant="danger" small icon={<Trash2 size={15} />} onClick={() => void remove()}>Delete area</Button>
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
