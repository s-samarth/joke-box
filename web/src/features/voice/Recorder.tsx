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
import { EmptyRecordingError, addRecording } from './outbox'
import { avoidType, useRecorder, type Recording } from './useRecorder'
import { useVoiceLibrary } from './useVoiceLibrary'
import { hashtagCounts } from './voiceMeta'

const canRecord = () => typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
const EMPTY: Draft = { label: '', hashtags: [] }

function micProblem(e: unknown): string {
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError') return 'Microphone access is blocked. Allow it for this site in your browser settings, then try again.'
  if (name === 'NotFoundError') return 'No microphone found.'
  return "Couldn't start recording. Try again."
}

/** Five bars that jump with your voice, so you can see it's picking you up. */
function Level({ level }: { level: number }) {
  return (
    <span className="flex h-6 items-center gap-1" aria-hidden>
      {[0.5, 0.8, 1, 0.8, 0.5].map((k, i) => (
        <span key={i} className="w-1.5 rounded-full bg-light transition-[height] duration-75" style={{ height: `${20 + Math.min(80, level * k * 100)}%` }} />
      ))}
    </span>
  )
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

  const keep = async (id: string, { audio, seconds }: Recording): Promise<number | null> => {
    if (seconds < 1 && audio.size < 4000) {
      setProblem('Too short to keep. Hold on a moment longer.')
      return null
    }
    try {
      await addRecording(id, audio, seconds)
      return seconds
    } catch (e) {
      if (!(e instanceof EmptyRecordingError)) throw e
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
      const id = newId()
      openCard(id, r.seconds, keep(id, r))
      toast('That note reached the length limit, so recording stopped. Tap record to carry on in a new note.')
    },
  })

  // Leaving the screen keeps a recording in progress, and files an open card with what was typed.
  const latest = useRef({ review, draft, finish, stop: rec.stop })
  useEffect(() => { latest.current = { review, draft, finish, stop: rec.stop } })
  useEffect(() => () => {
    const { review: open, draft: typed, finish: file, stop } = latest.current
    if (open) void file(open, typed)
    void stop().then((r) => r && addRecording(newId(), r.audio, r.seconds)).catch(() => {})
  }, [])

  const toggle = async () => {
    setProblem(null)
    setFlash(null)
    if (rec.recording) {
      const id = newId()
      openCard(id, rec.seconds, rec.stop().then((r) => (r ? keep(id, r) : null)))
      return
    }
    if (review) void finish(review, draft) // starting the next note files this one
    if (!canRecord()) return setProblem("This browser can't record audio.")
    try { await rec.start() } catch (e) { setProblem(micProblem(e)) }
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
        <NewNoteCard seconds={review.seconds} status={review.status} draft={draft} onChange={setDraft}
          suggestions={hashtagCounts(notes).map(([t]) => t)} onDone={() => void finish(review, draft)} onDelete={() => void discard(review)} />
      ) : (
        <div className="flex items-center gap-4">
          {recordButton}
          {rec.recording ? (
            <div className="flex flex-1 items-center gap-3" aria-live="polite">
              <span className="text-2xl tabular">{clock(rec.seconds)}</span>
              <Level level={rec.level} />
              <span className="ml-auto text-sm text-dim">Tap to stop</span>
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
