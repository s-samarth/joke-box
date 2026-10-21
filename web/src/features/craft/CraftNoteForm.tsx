/** Write or edit one craft note: its name, kind, area, the note itself, and where it came from. */
import { ExternalLink, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useCraftAreas } from '../../api/craft'
import type { CraftKind, CraftNoteInput } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { KINDS } from './craftMeta'

const FORMAT_HINT = 'Start a line with "# " for a heading, "- " for a list, "- [ ] " for a tick box. **Bold** works too.'

interface Props {
  initial: CraftNoteInput
  isNew: boolean
  onSave: (input: CraftNoteInput) => void
  onDelete?: () => void
}

export function CraftNoteForm({ initial, isNew, onSave, onDelete }: Props) {
  const [form, setForm] = useState(initial)
  const { data: areas = [] } = useCraftAreas()
  const [tags, setTags] = useState(initial.hashtags.join(' '))
  const set = (patch: Partial<CraftNoteInput>) => setForm((f) => ({ ...f, ...patch }))
  const link = form.url.trim()
  const linkOk = !link || /^https?:\/\//i.test(link)
  const ready = form.title.trim().length > 0 && linkOk && Boolean(form.area_id)

  const submit = () => {
    if (!ready) return
    const hashtags = tags.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith('#') ? t : `#${t}`))
    onSave({ ...form, title: form.title.trim(), url: link, source: form.source.trim(), hashtags })
  }

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <Field label="Name">
        <Input value={form.title} maxLength={200} placeholder="e.g. Crowd work tips" onChange={(e) => set({ title: e.target.value })} autoFocus={isNew} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kind" hint={KINDS.find((k) => k.key === form.kind)?.hint}>
          <Select value={form.kind} onChange={(e) => set({ kind: e.target.value as CraftKind })}>
            {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </Select>
        </Field>
        <Field label="Area" hint={areas.find((a) => a.id === form.area_id)?.description}>
          <Select value={form.area_id} onChange={(e) => set({ area_id: e.target.value })}>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="The note" hint={FORMAT_HINT}>
        <Textarea value={form.body} className="min-h-72 font-[inherit]" placeholder="What you learned, in your own words" onChange={(e) => set({ body: e.target.value })} />
      </Field>
      <Field label="Learned from" hint="A comic, a course, a book, a show of yours">
        <Input value={form.source} maxLength={200} placeholder="e.g. OneNote, Standup Comedy" onChange={(e) => set({ source: e.target.value })} />
      </Field>
      <Field label="Link" hint={linkOk ? undefined : 'Links start with http:// or https://'}>
        <div className="flex gap-2">
          <Input type="url" inputMode="url" value={form.url} maxLength={500} placeholder="https://…" onChange={(e) => set({ url: e.target.value })} />
          {link && linkOk && (
            <a href={link} target="_blank" rel="noopener noreferrer" aria-label="Open link" className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-ink-3 text-dim hover:text-paper sm:size-10"><ExternalLink size={17} /></a>
          )}
        </div>
      </Field>
      <Field label="Hashtags" hint="Separate with spaces">
        <Input value={tags} placeholder="#crowdwork #openers" onChange={(e) => setTags(e.target.value)} />
      </Field>
      <div className="flex items-center justify-between gap-3">
        {onDelete ? <Button variant="danger" small icon={<Trash2 size={15} />} onClick={onDelete}>Delete</Button> : <span />}
        <Button variant="tape" type="submit" disabled={!ready}>Save note</Button>
      </div>
    </form>
  )
}
