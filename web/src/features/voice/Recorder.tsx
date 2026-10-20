/**
 * The record button. Tap to start, tap to stop; stopping saves. Afterwards you can label the
 * note right there, or leave it and label it later. Leaving the screen mid-recording saves too.
 */
import { Check, Mic, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import { newId } from '../../api/client'
import { useFeedback } from '../../components/ui/feedbackContext'
import { clock } from '../../lib/duration'
import { NoteEditor } from './NoteEditor'
import { addRecording } from './outbox'
import { useRecorder, type Recording } from './useRecorder'
import { useVoiceLibrary } from './useVoiceLibrary'
import { hashtagCounts } from './voiceMeta'

const canRecord = () => typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

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

export function Recorder() {
  const { notes, edit } = useVoiceLibrary()
  const { toast } = useFeedback()
  const [lastId, setLastId] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const keep = async ({ audio, seconds }: Recording) => {
    if (seconds < 1 && audio.size < 4000) return // a slip of the thumb, not a note
    const id = newId()
    await addRecording(id, audio, seconds)
    setLastId(id)
  }
  const rec = useRecorder({ onLimit: (r) => { void keep(r); toast('Saved. That note reached the length limit, so recording stopped. Tap record to carry on in a new note.') } })
  const { stop } = rec

  // Navigating away mid-thought shouldn't lose it.
  useEffect(() => () => { void stop().then((r) => r && addRecording(newId(), r.audio, r.seconds)) }, [stop])

  const toggle = async () => {
    setProblem(null)
    if (rec.recording) {
      const result = await rec.stop()
      if (result) await keep(result)
      return
    }
    if (!canRecord()) return setProblem("This browser can't record audio.")
    setLastId(null)
    try { await rec.start() } catch (e) { setProblem(micProblem(e)) }
  }

  const last = notes.find((n) => n.id === lastId)
  return (
    <div className="rounded-xl bg-ink-2 p-4 ring-1 ring-rule">
      <div className="flex items-center gap-4">
        <button type="button" onClick={toggle} aria-label={rec.recording ? 'Stop and save' : 'Record a voice note'}
          className={`flex size-16 shrink-0 items-center justify-center rounded-full transition-colors ${rec.recording ? 'bg-light text-ink' : 'bg-tape text-tape-ink hover:bg-[#f5da77]'}`}>
          {rec.recording ? <Square size={22} fill="currentColor" /> : <Mic size={26} />}
        </button>
        {rec.recording ? (
          <div className="flex flex-1 items-center gap-3" aria-live="polite">
            <span className="text-2xl tabular">{clock(rec.seconds)}</span>
            <Level level={rec.level} />
            <span className="ml-auto text-sm text-dim">Tap to stop</span>
          </div>
        ) : last ? (
          <p className="flex items-center gap-2 text-dim"><Check size={18} className="text-ok" /> Saved, {clock(last.duration_seconds)}</p>
        ) : (
          <p className="text-dim">Tap to record. It saves when you stop.</p>
        )}
      </div>
      {problem && <p role="alert" className="mt-3 text-sm text-light">{problem}</p>}
      {last && !rec.recording && (
        <div className="mt-4 border-t border-rule pt-4">
          <NoteEditor key={last.id} note={last} suggestions={hashtagCounts(notes).map(([t]) => t)}
            onChange={(patch) => edit(last.id, { label: last.label, hashtags: last.hashtags, duration_seconds: last.duration_seconds, ...patch })} />
        </div>
      )}
    </div>
  )
}
