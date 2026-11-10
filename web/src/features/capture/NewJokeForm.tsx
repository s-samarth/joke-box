/**
 * The full "New joke" sheet: the words, the observations it came from (linked as it saves), every
 * detail the joke's own page has (topic and subtopic, with new ones made on the spot, type,
 * status, strength, runtime, clean rating, language, hashtags), notes, and a first brainstorm.
 *
 * Pattern: the form keeps a local draft in useState and hands `draft` + `update` to
 * JokeDetails, the same component the joke page uses with its autosaving draft. One set of
 * controls, two owners of the state, so the two screens can't drift apart.
 *
 * Closing without saving keeps what you typed (keptDraft), so a stray tap never loses a joke.
 */
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api, newId } from '../../api/client'
import { useTopics } from '../../api/library'
import { useLinkObservation, useObservations } from '../../api/notebook'
import { keys } from '../../api/queryClient'
import type { BrainstormInput } from '../../api/shows'
import type { JokeInput } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { GrowingText, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useFeedback } from '../../components/ui/feedbackContext'
import { JokeDetails } from '../jokes/JokeDetails'
import { PunchAlternates } from '../jokes/PunchAlternates'
import { TagLines } from '../jokes/TagLines'
import { ObservationPicker } from '../observations/ObservationPicker'
import { VoiceNotesOn } from '../voice/VoiceNotesOn'
import { forgetDraft, hasText, keepDraft, keptDraft, startDraft } from './keptDraft'
import { blankJoke, useCaptureJoke } from './newJoke'

export interface Prefill {
  topicId?: string
  subtopicId?: string | null
  /** Rests on this premise. */
  premiseId?: string | null
  setup?: string
  /** Came from these observations: shown under the words and linked when it's saved. */
  observationIds?: string[]
  /** Came from these voice notes: playable under the words, kept on the joke. */
  voiceNoteIds?: string[]
  /** Written as the next joke after this one. */
  followsId?: string
  hashtags?: string[]
  /** Runs with the new joke's id as it's saved (offline too): e.g. to link it to a brainstorm. */
  onCreated?: (jokeId: string) => void
}

/** `plain`: opened from the + button, not for something in particular, so a kept draft comes back. */
export function NewJokeForm({ prefill, plain, onClose }: { prefill: Prefill; plain: boolean; onClose: () => void }) {
  const { data: topics = [] } = useTopics()
  const randomId = topics.find((t) => t.is_system)?.id ?? ''
  const fresh = (): JokeInput => ({ ...blankJoke(prefill.topicId), subtopic_id: prefill.subtopicId ?? null, premise_id: prefill.premiseId ?? null, setup: prefill.setup ?? '', follows_id: prefill.followsId ?? null, hashtags: prefill.hashtags ?? [], voice_note_ids: prefill.voiceNoteIds ?? [] })
  const [start] = useState(() => startDraft(fresh(), plain, keptDraft(), prefill.observationIds))
  const [draft, setDraft] = useState<JokeInput>(start.draft)
  const [brainstorm, setBrainstorm] = useState(start.brainstorm)
  const [observationIds, setObservationIds] = useState(start.observationIds)
  const link = useLinkObservation()
  const { data: observations = [] } = useObservations()
  const [restored, setRestored] = useState(start.restored)
  const changed = restored || JSON.stringify([draft, brainstorm, observationIds]) !== JSON.stringify([start.draft, start.brainstorm, start.observationIds])
  const capture = useCaptureJoke()
  const qc = useQueryClient()
  const { toast } = useFeedback()
  // Topics may still be loading when the sheet opens, so "Random" is filled in at render time.
  const input = { ...draft, topic_id: draft.topic_id || randomId }
  const update = (patch: Partial<JokeInput>) => setDraft((d) => ({ ...d, ...patch }))
  const ready = draft.setup.trim().length > 0

  // Keep the text on this device as you type, so it outlives the sheet and the app.
  useEffect(() => {
    if (!start.owns || !changed) return
    if (hasText({ draft, brainstorm })) keepDraft({ draft, brainstorm, observationIds })
    else forgetDraft()
  }, [start.owns, changed, draft, brainstorm, observationIds])

  const close = () => {
    if (start.owns && changed && hasText({ draft, brainstorm })) toast('Unsaved joke kept for next time', { label: 'Discard', onClick: forgetDraft })
    onClose()
  }
  const startFresh = () => {
    forgetDraft()
    setDraft(fresh())
    setBrainstorm('')
    setObservationIds(prefill.observationIds ?? [])
    setRestored(false)
  }

  const submit = (open: boolean) => {
    if (!ready) return
    const notes = brainstorm.trim()
    // A brainstorm belongs to a joke, so it's saved once the server has the joke. The sheet
    // has closed by then, so this calls the API directly rather than through a hook.
    const onSaved = notes
      ? (jokeId: string) => {
          const input: BrainstormInput = { joke_id: jokeId, title: 'First brainstorm', content: notes, timer_seconds: 0 }
          api(`/api/brainstorms/${newId()}`, 'PUT', input).then(
            () => qc.invalidateQueries({ queryKey: keys.brainstorms }),
            (e: Error) => toast(`Brainstorm not saved: ${e.message}`),
          )
        }
      : undefined
    const full = (lines: string[] = []) => lines.filter((t) => t.trim())
    const id = capture({ ...input, tag_lines: full(input.tag_lines), alt_punchlines: full(input.alt_punchlines) }, { open, onSaved })
    if (!id) return
    // Queued after the joke's save, so they reach the server in order (offline too). One deleted
    // since it was picked (a kept draft can be days old) is skipped, not sent to fail.
    for (const obsId of observationIds.filter((o) => observations.some((x) => x.id === o))) link.mutate({ id: obsId, kind: 'jokes', targetId: id, on: true })
    prefill.onCreated?.(id)
    if (start.owns) forgetDraft()
    onClose()
  }

  const footer = (
    <>
      <Button variant="quiet" onClick={() => submit(true)} disabled={!ready}>Save and open</Button>
      <Button variant="tape" onClick={() => submit(false)} disabled={!ready}>Save joke</Button>
    </>
  )

  return (
    <Modal open onOpenChange={(o) => !o && close()} dirty={!start.owns && changed} title="New joke" footer={footer} wide>
      {restored && (
        <p className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-ink-3 py-1 pr-1 pl-3 text-sm text-dim">
          <span>Picked up the joke you didn't save.</span>
          <button type="button" onClick={startFresh} className="h-11 shrink-0 rounded-md px-3 font-medium text-paper hover:bg-ink-4">Start fresh</button>
        </p>
      )}
      <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); submit(false) }}>
        <div className="space-y-3 rounded-xl bg-ink p-4 ring-1 ring-rule">
          <GrowingText autoFocus aria-label="Setup" placeholder="The setup…" className="text-xl leading-snug" value={draft.setup}
            onChange={(e) => update({ setup: e.target.value })} />
          <div className="h-px bg-rule" />
          <GrowingText aria-label="Punchline" placeholder="The punchline" className="text-xl leading-snug text-tape placeholder:text-faint" value={draft.punchline}
            onChange={(e) => update({ punchline: e.target.value })} />
          <PunchAlternates punchline={draft.punchline} alternates={draft.alt_punchlines ?? []} onChange={update} />
          <TagLines lines={draft.tag_lines} onChange={(tag_lines) => update({ tag_lines })} />
        </div>

        <VoiceNotesOn ids={draft.voice_note_ids ?? []} onChange={(voice_note_ids) => update({ voice_note_ids })} />

        <section aria-label="From observations">
          <h3 className="mb-2 text-sm text-dim">From observations</h3>
          <ObservationPicker linkedIds={observationIds} topicId={input.topic_id} onLink={(o) => setObservationIds((ids) => [...ids, o])}
            onUnlink={(o) => setObservationIds((ids) => ids.filter((i) => i !== o))} />
        </section>

        <JokeDetails draft={input} update={update} />

        <div className="space-y-2">
          <label htmlFor="new-joke-notes" className="text-sm text-dim">Notes</label>
          <Textarea id="new-joke-notes" placeholder="Where it came from, what to try, who it's for" value={draft.comments} onChange={(e) => update({ comments: e.target.value })} />
        </div>

        <div className="space-y-2">
          <label htmlFor="new-joke-brainstorm" className="text-sm text-dim">Brainstorm</label>
          <Textarea id="new-joke-brainstorm" className="min-h-32" placeholder="Angles, act-outs, half-formed tags. Dump it all here." value={brainstorm} onChange={(e) => setBrainstorm(e.target.value)} />
          <p className="text-xs text-faint">Saved as the joke's first rewrite session, so you can pick it up later with the timer.</p>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
