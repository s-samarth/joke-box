/**
 * Log a show, ideally on the way home. Venue, how it went and how long are up top; the rest is
 * optional. Picking the set you did fills in the length and topics for you.
 */
import { Star } from 'lucide-react'
import { useState } from 'react'
import { newId } from '../../api/client'
import { useBits, useTopics } from '../../api/library'
import { useLogActions, useLogs, useSetlists, useVenues } from '../../api/shows'
import type { PerformanceLog } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { topicName } from '../../lib/bitMeta'
import { clock, parse } from '../../lib/duration'
import { fromIstInput, toIstInput } from '../../lib/time'

const UNKNOWN = 'Unidentified Venue'
const chip = (on: boolean) => `h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`

export function LogShowSheet({ log, onClose }: { log?: PerformanceLog; onClose: () => void }) {
  const { data: venues = [] } = useVenues()
  const { data: logs = [] } = useLogs()
  const { data: topics = [] } = useTopics()
  const { data: sets = [] } = useSetlists()
  const { data: bits = [] } = useBits()
  const { save } = useLogActions()
  const { toast } = useFeedback()
  const [venue, setVenue] = useState(log?.venue_name ?? '')
  const [when, setWhen] = useState(() => toIstInput(log?.performed_at ?? new Date().toISOString()))
  const [rating, setRating] = useState(log?.rating ?? 0)
  const [duration, setDuration] = useState(log ? clock(log.duration_seconds) : '')
  const [crowd, setCrowd] = useState(log ? String(log.audience_size) : '')
  const [topicIds, setTopicIds] = useState<string[]>(log?.topic_ids ?? [])
  const [notes, setNotes] = useState(log?.notes ?? '')
  const [error, setError] = useState('')
  const recent = [...new Set([...logs.map((l) => l.venue_name), ...venues.map((v) => v.name)])].filter((v) => v !== UNKNOWN).slice(0, 6)

  const fromSet = (id: string) => {
    const s = sets.find((x) => x.id === id)
    if (!s) return
    setDuration(clock(s.items.reduce((sum, i) => sum + i.duration_seconds, 0)))
    setTopicIds([...new Set(s.items.map((i) => bits.find((b) => b.id === i.bit_id)?.topic_id).filter((t): t is string => Boolean(t)))])
    if (s.venue_name && !venue) setVenue(s.venue_name)
  }
  const submit = () => {
    const seconds = parse(duration)
    if (!rating) return setError('Give it a rating from one to five stars.')
    if (seconds === null) return setError('Time on stage should look like 6:30.')
    save.mutate(
      { id: log?.id ?? newId(), input: { venue_name: venue.trim() || UNKNOWN, performed_at: fromIstInput(when), duration_seconds: seconds, audience_size: Number(crowd) || 0, rating, topic_ids: topicIds, notes: notes.trim() } },
      { onSuccess: () => { toast(log ? 'Show updated' : 'Show logged'); onClose() }, onError: (e) => setError(e.message) },
    )
  }

  return (
    <Modal open wide onOpenChange={(o) => !o && onClose()} title={log ? 'Edit show' : 'Log a show'}
      footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="tape" onClick={submit} disabled={save.isPending}>{log ? 'Save changes' : 'Log show'}</Button></>}>
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <div className="space-y-2">
          <Field label="Where"><Input list="jb-venue-list" placeholder="Venue name" value={venue} onChange={(e) => setVenue(e.target.value)} /></Field>
          <datalist id="jb-venue-list">{venues.map((v) => <option key={v.id} value={v.name} />)}</datalist>
          {recent.length > 0 && <div className="flex flex-wrap gap-2">{recent.map((v) => <button key={v} type="button" className={chip(venue === v)} onClick={() => setVenue(v)}>{v}</button>)}</div>}
        </div>
        <div className="space-y-1.5">
          <span className="text-sm text-dim">How did it go?</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} of 5`} onClick={() => setRating(n)} className="inline-flex size-12 items-center justify-center rounded-lg hover:bg-ink-3">
                <Star size={30} className={n <= rating ? 'fill-tape text-tape' : 'text-ink-4'} />
              </button>
            ))}
          </div>
        </div>
        {sets.length > 0 && !log && (
          <Field label="The set you did (fills in time and topics)">
            <Select defaultValue="" onChange={(e) => fromSet(e.target.value)}>
              <option value="">Choose a set</option>
              {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Time on stage"><Input inputMode="numeric" className="tabular" placeholder="6:30" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
          <Field label="People in the room"><Input type="number" inputMode="numeric" min={0} placeholder="25" value={crowd} onChange={(e) => setCrowd(e.target.value)} /></Field>
          <div className="col-span-2 sm:col-span-1"><Field label="When (IST)"><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field></div>
        </div>
        <div className="space-y-2">
          <span className="text-sm text-dim">Topics you did</span>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => {
              const on = topicIds.includes(t.id)
              return <button key={t.id} type="button" aria-pressed={on} className={chip(on)} onClick={() => setTopicIds(on ? topicIds.filter((x) => x !== t.id) : [...topicIds, t.id])}>{topicName(t)}</button>
            })}
          </div>
        </div>
        <Field label="Notes"><Textarea placeholder="What landed, what died, what the crowd was like" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        {error && <p className="text-sm text-light" role="alert">{error}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
