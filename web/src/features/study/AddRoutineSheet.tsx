/** Add a routine of your own to the watchlist: what it is, who, which category, and a link. */
import { useState } from 'react'
import { newId } from '../../api/client'
import { useSaveWatchItem } from '../../api/study'
import type { WatchItem } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useFeedback } from '../../components/ui/feedbackContext'
import { nextPosition } from './watchMeta'

export function AddRoutineSheet({ items, onClose }: { items: WatchItem[]; onClose: () => void }) {
  const [form, setForm] = useState({ title: '', comedian: '', category: '', url: '' })
  const save = useSaveWatchItem()
  const { toast } = useFeedback()
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))]
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))
  const link = form.url.trim()
  const linkOk = !link || /^https?:\/\//i.test(link)
  const ready = form.title.trim().length > 0 && linkOk

  const submit = () => {
    if (!ready) return
    const input = {
      title: form.title.trim(), comedian: form.comedian.trim(), category: form.category.trim(), url: link,
      description: '', position: nextPosition(items), contrast: null, logic_density: null, has_a_point: null, watched: false,
    }
    save.mutate({ id: newId(), input }, { onError: (e) => toast(`Not saved: ${e.message}`) })
    onClose()
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Add a routine"
      footer={<Button variant="tape" onClick={submit} disabled={!ready}>Add to watchlist</Button>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <Field label="Routine or special">
          <Input value={form.title} maxLength={200} placeholder="e.g. Airport Security" onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Comedian">
          <Input value={form.comedian} maxLength={120} onChange={(e) => set({ comedian: e.target.value })} />
        </Field>
        <Field label="Category" hint="Pick one of yours or type a new one.">
          <Input list="watch-categories" value={form.category} maxLength={120} placeholder="The Forensic Logicians" onChange={(e) => set({ category: e.target.value })} />
          <datalist id="watch-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Link (optional)" hint={linkOk ? 'Without one, Watch searches YouTube.' : 'Links start with http:// or https://'}>
          <Input type="url" inputMode="url" value={form.url} maxLength={500} placeholder="https://youtube.com/…" onChange={(e) => set({ url: e.target.value })} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
