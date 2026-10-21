/**
 * The record button. Tap to start, tap to stop. Stopping opens the "New voice note" card at once,
 * where you can add a title and hashtags while it saves in the background; Done files it.
 * Leaving the screen mid-recording, or mid-card, still keeps the note and what you typed.
 */
import { Check, Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { newId } from '../../api/client'
import { useFeedback } from '../../components/ui/feedbackContext'
import { clock } from '../../lib/duration'
import { NewNoteCard, type Draft } from './NewNoteCard'
import { forgetLive } from './inProgress'
import { EmptyRecordingError, addRecording } from './outbox'
import { useRecorder, type Recording } from './useRecorder'
import { useVoiceLibrary } from './useVoiceLibrary'
import { avoidType, hashtagCounts } from './voiceMeta'
import type { WakeState } from '../../lib/useWakeLock'

const canRecord = () => typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
const EMPTY: Draft = { label: '', hashtags: [] }

function micProblem(e: unknown): string {
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError') return 'Microphone access is blocked. Allow it for this site in your browser settings, then try again.'
  if (name === 'NotFoundError') return 'No microphone found.'
  return "Couldn't start recording. Try again."
}

/** Your voice over the last half second, newest bar on the right, so you can see it's hearing you. */
function Level({ levels }: { levels: number[] }) {
  return (
    <span className="flex h-7 items-center gap-1" aria-hidden>
      {levels.map((level, i) => (
        <span key={i} className="w-1.5 rounded-full bg-light transition-[height] duration-75" style={{ height: `${15 + level * 85}%` }} />
      ))}
    </span>
  )
}

/**
 * Whether the phone agreed to keep the screen on while recording. If it said no, the screen will
 * dim and lock as usual, and a locked phone stops the mic, so say so plainly.
 */
function ScreenNote({ state }: { state: WakeState }) {
  if (state === 'held') return <span className="block text-xs text-faint">Screen stays on</span>
  if (state !== 'refused') return null
  return <span className="block text-xs text-amber">Screen may lock: tap it now and then</span>
}

/** The note on the card. `saved` settles to its length once it's safely on the device, or null if it wasn't kept. */
interface Review {
  id: string
  seconds: number
  status: 'saving' | 'saved'
  saved: Promise<number | null>
}

export function Recorder() {
  const { notes, edit, remove } = useVoiceLibrary()
  const { toast } = useFeedback()
  const [review, setReview] = useState<Review | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [flash, setFlash] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const keep = async ({ id, audio, seconds }: Recording): Promise<number | null> => {
    if (seconds < 1 && audio.size < 4000) {
      setProblem('Too short to keep. Hold on a moment longer.')
      void forgetLive(id)
      return null
    }
    try {
      await addRecording(id, audio, seconds)
      return seconds
    } catch (e) {
      if (!(e instanceof EmptyRecordingError)) throw e
      void forgetLive(id)
      avoidType(audio.type) // the browser said it could record this format, then gave us nothing
      setProblem(`That recording came out empty (${audio.type || 'unknown format'}). The next one will use a different format, so please try again.`)
      return null
    }
  }

  const finish = async (r: Review, d: Draft) => {
    setReview(null)
    const seconds = await r.saved
    if (seconds === null) return
    const label = d.label.trim()
    if (label || d.hashtags.length) await edit(r.id, { label, hashtags: d.hashtags, duration_seconds: seconds })
    setFlash(label ? `Saved “${label}”` : 'Saved')
  }

  const discard = async (r: Review) => {
    setReview(null)
    if ((await r.saved) !== null) await remove(r.id)
  }

  const openCard = (id: string, seconds: number, saved: Promise<number | null>) => {
    setDraft(EMPTY)
    setReview({ id, seconds, status: 'saving', saved })
    void saved.then((s) => setReview((v) => (v?.id !== id ? v : s === null ? null : { ...v, seconds: s, status: 'saved' })))
  }

  const rec = useRecorder({
    onLimit: (r) => {
      openCard(r.id, r.seconds, keep(r))
      toast('That note reached the length limit, so recording stopped. Tap record to carry on in a new note.')
    },
    onInterrupted: (r) => {
      openCard(r.id, r.seconds, keep(r))
      toast('Recording stopped when the phone took the mic (screen lock or a call). What was recorded is saved.')
    },
  })

  // Leaving the screen keeps a recording in progress, and files an open card with what was typed.
  const latest = useRef({ review, draft, finish, stop: rec.stop })
  useEffect(() => { latest.current = { review, draft, finish, stop: rec.stop } })
  useEffect(() => () => {
    const { review: open, draft: typed, finish: file, stop } = latest.current
    if (open) void file(open, typed)
    void stop().then((r) => r && addRecording(r.id, r.audio, r.seconds)).catch(() => {})
  }, [])

  const toggle = async () => {
    setProblem(null)
    setFlash(null)
    if (rec.recording) {
      const id = rec.id
      if (id) openCard(id, rec.seconds, rec.stop().then((r) => (r ? keep(r) : null)))
      return
    }
    if (review) void finish(review, draft) // starting the next note files this one
    if (!canRecord()) return setProblem("This browser can't record audio.")
    try { await rec.start(newId()) } catch (e) { setProblem(micProblem(e)) }
  }

  const recordButton = (
    <button type="button" onClick={toggle} aria-label={rec.recording ? 'Stop recording' : 'Record a voice note'}
      className={`flex size-16 shrink-0 items-center justify-center rounded-full transition-colors ${rec.recording ? 'bg-light text-ink' : 'bg-tape text-tape-ink hover:bg-[#f5da77]'}`}>
      {rec.recording ? <Square size={22} fill="currentColor" /> : <Mic size={26} />}
    </button>
  )

  return (
    <div className="rounded-xl bg-ink-2 p-4 ring-1 ring-rule">
      {review && !rec.recording ? (
        <NewNoteCard key={review.id} id={review.id} seconds={review.seconds} status={review.status} draft={draft} onChange={setDraft}
          suggestions={hashtagCounts(notes).map(([t]) => t)} onDone={() => void finish(review, draft)} onDelete={() => void discard(review)} />
      ) : (
        <div className="flex items-center gap-4">
          {recordButton}
          {rec.recording ? (
            <div className="flex flex-1 items-center gap-3" aria-live="polite">
              <span className="text-2xl tabular">{clock(rec.seconds)}</span>
              <Level levels={rec.levels} />
              <span className="ml-auto text-right text-sm text-dim">Tap to stop<ScreenNote state={rec.screen} /></span>
            </div>
          ) : flash ? (
            <p className="flex min-w-0 items-center gap-2 text-dim"><Check size={18} className="shrink-0 text-ok" /><span className="truncate">{flash}</span></p>
          ) : (
            <p className="text-dim">Tap to record. You can add a title when you stop.</p>
          )}
        </div>
      )}
      {problem && <p role="alert" className="mt-3 text-sm text-light">{problem}</p>}
    </div>
  )
}
