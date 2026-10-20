/** Log a mic: venue, IST date and time, duration, audience, stars, topics and notes. */
import { Star } from 'lucide-react'
import { useState } from 'react'
import { newId } from '../../api/client'
import { useTopics } from '../../api/library'
import { useLogActions, useVenues } from '../../api/shows'
import type { PerformanceLog } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { clock, parse } from '../../lib/duration'
import { fromIstInput, toIstInput } from '../../lib/time'

const UNIDENTIFIED = 'Unidentified Venue'
const NEW = '__new__'

export function LogForm({ log, onClose }: { log?: PerformanceLog; onClose: () => void }) {
  const { data: venues = [] } = useVenues()
  const { data: topics = [] } = useTopics()
  const actions = useLogActions()
  const { prompt, toast } = useFeedback()
  const [venue, setVenue] = useState(log?.venue_name ?? UNIDENTIFIED)
  const [when, setWhen] = useState(() => toIstInput(log?.performed_at ?? new Date().toISOString()))
  const [duration, setDuration] = useState(log ? clock(log.duration_seconds) : '')
  const [audience, setAudience] = useState(String(log?.audience_size ?? ''))
  const [rating, setRating] = useState(log?.rating ?? 3)
  const [topicIds, setTopicIds] = useState<string[]>(log?.topic_ids ?? [])
  const [notes, setNotes] = useState(log?.notes ?? '')
  const [error, setError] = useState('')
  const venueNames = [...new Set([UNIDENTIFIED, ...venues.map((v) => v.name), venue])]

  const onVenue = async (value: string) => {
    if (value !== NEW) return setVenue(value)
    const name = await prompt({ title: 'New venue', label: 'Venue name', confirmLabel: 'Add' })
    if (name) actions.addVenue.mutate(name, { onSuccess: (v) => setVenue(v.name) })
  }

  const submit = () => {
    const seconds = parse(duration)
    if (seconds === null) return setError('Duration should look like 6:30.')
    if (!when) return setError('Pick a date and time.')
    const input = {
      venue_name: venue, performed_at: fromIstInput(when), duration_seconds: seconds,
      audience_size: Number(audience) || 0, rating, topic_ids: topicIds, notes: notes.trim(),
    }
    actions.save.mutate({ id: log?.id ?? newId(), input }, {
      onSuccess: () => { toast(log ? 'Log updated' : 'Mic logged'); onClose() },
      onError: (e) => setError(e.message),
    })
  }

  return (
    <Modal open wide onOpenChange={(o) => !o && onClose()} title={log ? 'Edit log' : 'Log a mic'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit} disabled={actions.save.isPending}>Save</Button></>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Venue">
            <Select value={venue} onChange={(e) => onVenue(e.target.value)}>
              {venueNames.map((v) => <option key={v} value={v}>{v}</option>)}
              <option value={NEW}>+ Add venue…</option>
            </Select>
          </Field>
          <Field label="Date and time (IST)"><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
          <Field label="Duration (mm:ss)"><Input inputMode="numeric" className="tabular" placeholder="6:30" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
          <Field label="Audience size"><Input type="number" inputMode="numeric" min={0} placeholder="25" value={audience} onChange={(e) => setAudience(e.target.value)} /></Field>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted">How did it go?</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)} className="inline-flex size-12 items-center justify-center rounded-xl hover:bg-white/5">
                <Star size={28} className={n <= rating ? 'fill-accent text-accent' : 'text-white/20'} />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted">Topics performed</span>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => {
              const on = topicIds.includes(t.id)
              return (
                <button key={t.id} type="button" aria-pressed={on} onClick={() => setTopicIds(on ? topicIds.filter((x) => x !== t.id) : [...topicIds, t.id])} className={`h-9 rounded-full px-3 text-sm ring-1 ${on ? 'bg-accent-soft text-accent ring-accent/30' : 'text-muted ring-line'}`}>
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>
        <Field label="Notes"><Textarea placeholder="What worked, what didn’t…" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
