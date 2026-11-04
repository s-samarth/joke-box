/**
 * Log a show, ideally on the way home. Venue, how it went and how long are up top; the rest is
 * optional. Picking the sets you did (none, one or several) ticks their topics and lists their jokes,
 * each to mark bombed, OK or killed. You can count the laughs for LPM, and write down what you
 * learned: that becomes a craft note linked to the show.
 * Coming off Stage, it starts with that set ticked and the time from Stage's clock.
 */
import { Star } from 'lucide-react'
import { useState } from 'react'
import { newId } from '../../api/client'
import { announceSave } from '../../lib/announce'
import { useCraftAreas, useCraftKinds, useCraftNotes, useSaveCraftNote } from '../../api/craft'
import { useJokes, useTopics } from '../../api/library'
import { useLogActions, useLogs, useSetlists, useVenues } from '../../api/shows'
import type { LogJoke, PerformanceLog } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { topicName } from '../../lib/jokeMeta'
import { StageTimeField } from './StageTimeField'
import { type StageTime, stageSeconds, toStageTime } from './stageTime'
import { formatDate, fromIstInput, toIstInput } from '../../lib/time'
import { useChanged } from '../../lib/useChanged'
import { areaFor, kindFor, lessonFrom } from '../craft/craftMeta'
import { LaughTally } from './LaughTally'
import { NO_LAUGHS, counted } from './lpm'
import { setTopics, swapTopics } from './setPick'
import { ShowJokesField } from './ShowJokesField'
import { setJokes, swapJokes } from './showJokes'

const UNKNOWN = 'Unidentified Venue'
const chip = (on: boolean) => `hit relative h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`

/** What a new show starts with when you log it straight after doing a set on Stage. */
export interface ShowPrefill {
  setId?: string
  seconds?: number
}

export function LogShowSheet({ log, prefill, onClose }: { log?: PerformanceLog; prefill?: ShowPrefill; onClose: () => void }) {
  const { data: venues = [] } = useVenues()
  const { data: logs = [] } = useLogs()
  const { data: topics = [] } = useTopics()
  const { data: sets = [] } = useSetlists()
  const { data: jokes = [] } = useJokes()
  const { save } = useLogActions()
  const { data: craft = [] } = useCraftNotes()
  const { data: areas = [] } = useCraftAreas()
  const { data: kinds = [] } = useCraftKinds()
  const saveLesson = useSaveCraftNote()
  const { toast } = useFeedback()
  const [venue, setVenue] = useState(log?.venue_name ?? '')
  const [when, setWhen] = useState(() => toIstInput(log?.performed_at ?? new Date().toISOString()))
  const [rating, setRating] = useState(log?.rating ?? 0)
  const [duration, setDuration] = useState<StageTime>(log ? toStageTime(log.duration_seconds) : prefill?.seconds ? toStageTime(prefill.seconds) : { min: '', sec: '' })
  const [crowd, setCrowd] = useState(log ? String(log.audience_size) : '')
  const [setIds, setSetIds] = useState<string[]>(() => (!log && prefill?.setId && sets.some((s) => s.id === prefill.setId) ? [prefill.setId] : []))
  const [topicIds, setTopicIds] = useState<string[]>(() => log?.topic_ids ?? setTopics(sets.filter((s) => setIds.includes(s.id)), jokes))
  const [done, setDone] = useState<LogJoke[]>(() => log ? (log.jokes ?? []) : setJokes(sets.filter((s) => setIds.includes(s.id))).map((joke_id) => ({ joke_id, result: null })))
  const [notes, setNotes] = useState(log?.notes ?? '')
  const [laughs, setLaughs] = useState(log?.laughs ?? NO_LAUGHS)
  const [lesson, setLesson] = useState('')
  const [error, setError] = useState('')
  // One id for this sheet, made once: tapping Log show twice saves the same show twice, not two shows.
  const [id] = useState(() => log?.id ?? newId())
  // Ask before closing on anything typed, or on the time carried over from Stage (it can't be got back).
  const dirty = useChanged([venue, when, rating, duration, crowd, topicIds, done, notes, laughs, lesson, setIds]) || Boolean(prefill?.seconds)
  const recent = [...new Set([...logs.map((l) => l.venue_name), ...venues.map((v) => v.name)])].filter((v) => v !== UNKNOWN).slice(0, 6)

  // Ticking a set on or off swaps its topics in or out (topics you tapped yourself stay). Time on
  // stage is left alone: it's never exactly the set's length, with laughs to wait for and jokes skipped.
  const toggleSet = (id: string) => {
    const next = setIds.includes(id) ? setIds.filter((x) => x !== id) : [...setIds, id]
    const chosen = sets.filter((s) => next.includes(s.id))
    const before = sets.filter((s) => setIds.includes(s.id))
    setSetIds(next)
    setTopicIds(swapTopics(topicIds, setTopics(before, jokes), setTopics(chosen, jokes)))
    setDone(swapJokes(done, setJokes(before), setJokes(chosen)))
  }
  // Only jokes that still exist. A show cached before shows had jokes, edited without adding any,
  // leaves them out of the save, so jokes recorded on another device stay as they are.
  const live = new Set(jokes.map((j) => j.id))
  const jokesDone = log && !log.jokes && done.length === 0 ? {} : { jokes: done.filter((d) => live.has(d.joke_id)) }
  const submit = () => {
    const seconds = stageSeconds(duration)
    if (!rating) return setError('Give it a rating from one to five stars.')
    const venueName = venue.trim() || UNKNOWN
    const performedAt = fromIstInput(when)
    // Both saves are queued and close the sheet at once, signal or not. The queue sends them in
    // order, so the show reaches the server before the lesson that points at it.
    const saving = save.mutateAsync(
      { id, input: { venue_name: venueName, performed_at: performedAt, duration_seconds: seconds, audience_size: Number(crowd) || 0, rating, topic_ids: topicIds, notes: notes.trim(), laughs: counted(laughs) ? laughs : null, ...jokesDone } },
    )
    saving.catch((e: Error) => toast(`Show not saved: ${e.message}`))
    if (lesson.trim()) saveLesson.mutate({ id: newId(), input: lessonFrom(lesson, craft, { area_id: areaFor(areas, 'stage'), kind_id: kindFor(kinds) }, { performance_log_id: id, source: `Show at ${venueName}, ${formatDate(performedAt)}`, created_at: new Date().toISOString() }) })
    announceSave(saving, toast, log ? 'Show updated' : 'Show logged')
    onClose()
  }

  return (
    <Modal open wide onOpenChange={(o) => !o && onClose()} dirty={dirty} title={log ? 'Edit show' : 'Log a show'}
      footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="tape" onClick={submit} disabled={save.isPending && !save.isPaused}>{log ? 'Save changes' : 'Log show'}</Button></>}>
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
          <div className="space-y-2">
            <span className="text-sm text-dim">The sets you did (optional; ticks their topics and jokes)</span>
            <div className="flex flex-wrap gap-2">
              {sets.map((s) => {
                const on = setIds.includes(s.id)
                return (
                  <button key={s.id} type="button" aria-pressed={on} className={chip(on)} onClick={() => toggleSet(s.id)}>
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <ShowJokesField done={done} jokes={jokes} onChange={setDone} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StageTimeField value={duration} onChange={setDuration} />
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
        <LaughTally laughs={laughs} seconds={stageSeconds(duration)} onChange={setLaughs} />
        <Field label="Remarks"><Textarea placeholder="What went right, what went wrong, what the crowd was like" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Field label="What did you learn?" hint="Saved to Craft, linked to this show, in the area that shows on Stage">
          <Textarea placeholder="e.g. Slow down before the punch" className="min-h-16" value={lesson} onChange={(e) => setLesson(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-light" role="alert">{error}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
