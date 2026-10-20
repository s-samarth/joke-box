/**
 * One brainstorm session, full screen: a timer, a title, and either a typing page or a
 * handwriting page (switch any time; both are kept), plus linked jokes and observations.
 */
import { Keyboard, Pause, PenLine, Play, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useSessions } from '../../api/sessions'
import type { Stroke, WritingSession } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/bits'
import { GrowingText } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { clock } from '../../lib/duration'
import { useTimer } from '../bits/useTimer'
import { INK_COLORS } from './ink'
import { InkCanvas, type InkTool } from './InkCanvas'
import { InkToolbar } from './InkToolbar'
import { SessionLinks } from './SessionLinks'
import { useSessionAutosave } from './useSessionAutosave'

type Mode = 'type' | 'write'
const MODE_KEY = 'jokebox.brainstorm.mode'
const savedMode = (): Mode => { try { return localStorage.getItem(MODE_KEY) === 'write' ? 'write' : 'type' } catch { return 'type' } }

const modeButton = (on: boolean) =>
  `inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'text-dim hover:text-paper'}`

function Workspace({ id, start }: { id: string; start?: WritingSession }) {
  const [title, setTitle] = useState(start?.title ?? '')
  const [content, setContent] = useState(start?.content ?? '')
  const [ink, setInk] = useState<Stroke[]>(start?.ink ?? [])
  const [bitIds, setBitIds] = useState(start?.bit_ids ?? [])
  const [observationIds, setObservationIds] = useState(start?.observation_ids ?? [])
  const [mode, setMode] = useState<Mode>(() => (start?.ink.length && !start.content ? 'write' : savedMode()))
  const [tool, setTool] = useState<InkTool>('pen')
  const [color, setColor] = useState<string>(INK_COLORS[0])
  const timer = useTimer(start?.timer_seconds ?? 0)
  const { confirm } = useFeedback()
  const autosave = useSessionAutosave(id, { title, content, ink, timer_seconds: timer.seconds, bit_ids: bitIds, observation_ids: observationIds })
  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  // Wrap each setter so any edit marks the session for the next autosave.
  const edit = <T,>(set: (v: T) => void) => (v: T) => { autosave.touch(); set(v) }
  const switchMode = (m: Mode) => { setMode(m); try { localStorage.setItem(MODE_KEY, m) } catch { /* private mode */ } }
  const toggleTimer = () => { if (timer.running) { timer.pause(); autosave.saveNow() } else timer.start() }
  const clearInk = async () => {
    if (await confirm({ title: 'Clear the handwriting?', message: 'Everything drawn on this page goes.', confirmLabel: 'Clear page', danger: true })) edit(setInk)([])
  }

  return (
    <div className="pt-safe min-h-dvh pb-24">
      <header className="sticky top-0 z-10 border-b border-rule bg-ink/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2 sm:px-6">
          <Link to="/brainstorm" aria-label="Close session" className="inline-flex size-10 items-center justify-center rounded-lg text-dim hover:bg-ink-3 hover:text-paper"><X size={20} /></Link>
          <button type="button" onClick={toggleTimer} aria-label={timer.running ? 'Pause timer' : 'Start timer'} className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 ${timer.running ? 'bg-tape text-tape-ink' : 'bg-ink-3'}`}>
            {timer.running ? <Pause size={16} /> : <Play size={16} />}
            <span className="headline text-xl tabular">{clock(timer.seconds)}</span>
          </button>
          <IconButton label="Reset timer" onClick={() => { timer.reset(); autosave.saveNow() }}><RotateCcw size={16} /></IconButton>
          <div className="ml-auto flex rounded-lg bg-ink-3 p-0.5" role="group" aria-label="Page">
            <button type="button" aria-pressed={mode === 'type'} onClick={() => switchMode('type')} className={modeButton(mode === 'type')}><Keyboard size={16} /><span className="hidden sm:inline">Type</span></button>
            <button type="button" aria-pressed={mode === 'write'} onClick={() => switchMode('write')} className={modeButton(mode === 'write')}><PenLine size={16} /><span className="hidden sm:inline">Handwrite</span></button>
          </div>
        </div>
        {mode === 'write' && (
          <div className="no-scrollbar overflow-x-auto border-t border-rule px-3 py-1.5 sm:px-6">
            <InkToolbar tool={tool} color={color} onTool={setTool} onColor={setColor} hasInk={ink.length > 0}
              onUndo={() => edit(setInk)(ink.slice(0, -1))} onClear={clearInk} />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-8">
        <div className="flex items-baseline justify-between gap-3">
          <GrowingText aria-label="Session title" placeholder="Name this session (optional)" className="headline text-3xl" value={title} onChange={(e) => edit(setTitle)(e.target.value)} />
          <span className="shrink-0 text-sm text-faint tabular" aria-live="polite">{autosave.saving ? 'Saving…' : mode === 'type' ? `${words} words` : ''}</span>
        </div>
        <div className="mt-4">
          <SessionLinks bitIds={bitIds} observationIds={observationIds} onChange={(b, o) => { autosave.touch(); setBitIds(b); setObservationIds(o) }} />
        </div>
        <div className="mt-6">
          {mode === 'type' ? (
            <GrowingText aria-label="Brainstorm" autoFocus placeholder="Write anything. Premises, angles, tags, a rant that might be a bit." className="min-h-[55dvh] text-lg leading-relaxed" value={content} onChange={(e) => edit(setContent)(e.target.value)} />
          ) : (
            <InkCanvas strokes={ink} onChange={edit(setInk)} tool={tool} color={color} size={2.4} />
          )}
        </div>
      </main>
    </div>
  )
}

export function SessionPage() {
  const { sessionId = '' } = useParams()
  const { data: sessions, isPending } = useSessions()
  if (isPending && !sessions) return <div className="p-8"><Spinner /></div>
  // key: opening a different session starts a fresh workspace instead of reusing the old state.
  return <Workspace key={sessionId} id={sessionId} start={sessions?.find((s) => s.id === sessionId)} />
}
