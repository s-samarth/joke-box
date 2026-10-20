/** Add / Edit Bit dialog. Saving works offline: it's queued and synced when back online. */
import { useMemo, useState } from 'react'
import { newId } from '../../api/client'
import { useBits, useSaveBit } from '../../api/library'
import type { Bit, CleanRating } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { CLEAN_LABELS, LANGUAGE_SUGGESTIONS } from '../../lib/bitMeta'
import { HashtagInput, TagLinesInput } from './editor/ListInputs'
import { PlacementFields } from './editor/PlacementFields'
import { StrengthSlider } from './editor/StrengthSlider'
import { TypePicker } from './editor/TypePicker'
import { toInput, useDraft, type Draft } from './useBitDraft'

interface Props {
  bit?: Bit
  initial: Draft
  onClose: () => void
}

export function BitEditor({ bit, initial, onClose }: Props) {
  const { draft, set } = useDraft(initial)
  const [error, setError] = useState('')
  const save = useSaveBit()
  const { toast } = useFeedback()
  const { data: bits = [] } = useBits()
  const hashtagSuggestions = useMemo(() => [...new Set(bits.flatMap((b) => b.hashtags))].sort(), [bits])

  const submit = () => {
    const input = toInput(draft)
    if (typeof input === 'string') return setError(input)
    save.mutate({ id: bit?.id ?? newId(), input }, { onError: (e) => toast(`Not saved: ${e.message}`) })
    toast(navigator.onLine ? (bit ? 'Bit updated' : 'Bit saved') : 'Saved offline — will sync')
    onClose()
  }

  return (
    <Modal
      open
      wide
      onOpenChange={(open) => !open && onClose()}
      title={bit ? 'Edit bit' : 'New bit'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Save bit</Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <Field label="Setup *">
          <Textarea autoFocus={!bit} value={draft.setup} placeholder="The premise…" onChange={(e) => set('setup', e.target.value)} />
        </Field>
        <Field label="Punchline">
          <Textarea value={draft.punchline} placeholder="The punch…" onChange={(e) => set('punchline', e.target.value)} />
        </Field>
        <Field label="Tag lines" hint="Extra punchlines that follow the main punch.">
          <TagLinesInput value={draft.tagLines} onChange={(v) => set('tagLines', v)} />
        </Field>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted">Type</span>
          <TypePicker value={draft.types} onChange={(v) => set('types', v)} />
        </div>
        <PlacementFields draft={draft} set={set} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Duration" hint="mm:ss, e.g. 0:45">
            <Input inputMode="numeric" className="tabular" placeholder="0:30" value={draft.duration} onChange={(e) => set('duration', e.target.value)} />
          </Field>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted">Strength</span>
            <StrengthSlider value={draft.strength} onChange={(v) => set('strength', v)} />
          </div>
          <Field label="Clean rating">
            <Select value={draft.cleanRating ?? ''} onChange={(e) => set('cleanRating', (e.target.value || null) as CleanRating | null)}>
              <option value="">Not set</option>
              {Object.entries(CLEAN_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Language">
            <Input list="jokebox-languages" placeholder="Hinglish" value={draft.language} onChange={(e) => set('language', e.target.value)} />
            <datalist id="jokebox-languages">{LANGUAGE_SUGGESTIONS.map((l) => <option key={l} value={l} />)}</datalist>
          </Field>
        </div>
        <Field label="Hashtags">
          <HashtagInput value={draft.hashtags} onChange={(v) => set('hashtags', v)} suggestions={hashtagSuggestions} />
        </Field>
        <Field label="Comments">
          <Textarea value={draft.comments} placeholder="Notes to self…" onChange={(e) => set('comments', e.target.value)} />
        </Field>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
