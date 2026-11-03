/**
 * One brainstorm session, full screen: a timer, a title, and either a typing page or blank
 * handwriting pages (switch any time; both are kept), plus linked jokes and observations.
 * A session can run a craft technique (/brainstorm/<id>?technique=<noteId> starts one with it).
 */
import { Keyboard, Pause, PenLine, Play, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useSession, useSessionList } from '../../api/sessions'
import type { Stroke, WritingSession } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { EmptyState, Spinner } from '../../components/ui/pieces'
import { GrowingText } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { useOnline } from '../../layout/useOnline'
import { clock } from '../../lib/duration'
import { useTimer } from '../jokes/useTimer'
import { chooseFingerDraws, fingerDraws, pencilSeen } from './fingerDraw'
import { pageCount, removePage, replacePage, strokesOn, undoOn } from './ink'
import { InkCanvas, type InkTool } from './InkCanvas'
import { InkToolbar } from './InkToolbar'
import { type Mode, type Pen, saveFocus, savedFocus, savedMode, savedPen, saveMode, savePen } from './prefs'
import { SessionLinks } from './SessionLinks'
import { TechniquePanel } from './TechniquePanel'
import { useSessionAutosave } from './useSessionAutosave'

const modeButton = (on: boolean) =>
  `inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'text-dim hover:text-paper'}`

function Workspace({ id, start, technique }: { id: string; start?: WritingSession; technique: string | null }) {
  const [title, setTitle] = useState(start?.title ?? '')
  const [content, setContent] = useState(start?.content ?? '')
  const [ink, setInk] = useState<Stroke[]>(start?.ink ?? [])
  // A session cached before pages existed has no ink_pages; pageCount then counts from the ink.
  const [pages, setPages] = useState(() => pageCount(start?.ink ?? [], start?.ink_pages))
  const [page, setPage] = useState(0)
  const [jokeIds, setJokeIds] = useState(start?.joke_ids ?? [])
  const [observationIds, setObservationIds] = useState(start?.observation_ids ?? [])
  const [techniqueId, setTechniqueId] = useState(start ? start.technique_id : technique)
  const [mode, setMode] = useState<Mode>(() => (start?.ink.length && !start.content ? 'write' : savedMode()))
  const [tool, setTool] = useState<InkTool>('pen')
  const [pen, setPen] = useState(savedPen)
  const [finger, setFinger] = useState(fingerDraws)
  const [zoom, setZoom] = useState(1)
  const [focus, setFocus] = useState(savedFocus)
  // Full screen: only the handwriting tools and the page, edge to edge.
  const full = mode === 'write' && focus
  const timer = useTimer(start?.timer_seconds ?? 0)
  const { confirm } = useFeedback()
  // Handwriting saves after a longer pause: a big session takes a moment to package, and that
  // shouldn't land mid-word.
  const autosave = useSessionAutosave(id, { title, content, ink, ink_pages: pages, timer_seconds: timer.seconds, joke_ids: jokeIds, observation_ids: observationIds, technique_id: techniqueId ?? null }, mode === 'write' ? 3000 : 1200)
  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  // Wrap each setter so any edit marks the session for the next autosave.
  const edit = <T,>(set: (v: T) => void) => (v: T) => { autosave.touch(); set(v) }
  const switchMode = (m: Mode) => { setMode(m); saveMode(m) }
  const changeFocus = (on: boolean) => { setFocus(on); saveFocus(on) }
  const toggleTimer = () => { if (timer.running) { timer.pause(); autosave.saveNow() } else timer.start() }
  const pageInk = strokesOn(ink, page)
  // Functional updates, so two strokes finished before a re-render both land.
  const editInk = (change: (all: Stroke[]) => Stroke[]) => { autosave.touch(); setInk(change) }
  const changePen = (next: Partial<Pen>) => {
    const merged = { ...pen, ...next }
    setPen(merged)
    savePen(merged)
  }
  const changeFinger = (on: boolean) => { chooseFingerDraws(on); setFinger(on) }
  const onPencil = () => { pencilSeen(); setFinger(fingerDraws()) }
  const addPage = () => { autosave.touch(); setPages(pages + 1); setPage(pages) }
  const clearOrDeletePage = async () => {
    if (!pageInk.length) {
      if (pages === 1) return
      editInk((all) => removePage(all, page))
      setPages(pages - 1)
      setPage(Math.min(page, pages - 2))
      return
    }
    if (await confirm({ title: 'Clear this page?', message: 'Everything drawn on this page goes.', confirmLabel: 'Clear page', danger: true })) {
      editInk((all) => replacePage(all, page, []))
    }
  }

  return (
    // Handwriting: nothing on the page can be selected, so a resting Pencil never picks up text.
    <div className={`pt-safe min-h-dvh pb-24 ${mode === 'write' ? 'select-none [-webkit-touch-callout:none]' : ''}`}>
      {/* Solid while handwriting: blurring the big page behind it on every scroll step costs the iPad frames. */}
      <header className={`sticky top-0 z-10 border-b border-rule ${mode === 'write' ? 'bg-ink' : 'bg-ink/95 backdrop-blur'}`}>
        {!full && <div className="flex items-center gap-2 px-3 py-2 sm:px-6">
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
        </div>}
        {mode === 'write' && (
          <div className={`px-3 py-1.5 sm:px-6 ${full ? '' : 'border-t border-rule'}`}>
            <InkToolbar tool={tool} color={pen.color} size={pen.size} onTool={setTool} onColor={(color) => changePen({ color })} onSize={(size) => changePen({ size })}
              hasInk={pageInk.length > 0} onUndo={() => editInk((all) => undoOn(all, page))} onClear={clearOrDeletePage}
              page={page} pages={pages} onPage={setPage} onAddPage={addPage}
              fingerDraws={finger} onFingerDraws={changeFinger} fullScreen={full} onFullScreen={changeFocus} />
          </div>
        )}
      </header>

      {/* Handwriting takes the whole width (the page is two screens of it); the rest stays a readable column. */}
      <main className={mode === 'write' ? 'mx-auto max-w-[1440px] px-2 pt-3 sm:px-4' : 'mx-auto max-w-3xl px-4 pt-6 sm:px-8'}>
        {!full && <div className={mode === 'write' ? 'max-w-3xl px-2 pt-3 pb-6' : 'pb-6'}>
        <div className="flex items-baseline justify-between gap-3">
          <GrowingText aria-label="Session title" placeholder="Name this session (optional)" className="headline text-3xl select-text" value={title} onChange={(e) => edit(setTitle)(e.target.value)} />
          <span className="shrink-0 text-sm text-faint tabular" aria-live="polite">{mode === 'write' ? '' : autosave.saving ? 'Saving…' : `${words} words`}</span>
        </div>
        <div className="mt-4">
          <TechniquePanel techniqueId={techniqueId ?? null} onChange={edit(setTechniqueId)} />
        </div>
        <div className="mt-4">
          <SessionLinks jokeIds={jokeIds} observationIds={observationIds} onChange={(b, o) => { autosave.touch(); setJokeIds(b); setObservationIds(o) }} />
        </div>
        </div>}
        <div>
          {mode === 'type' ? (
            <GrowingText aria-label="Brainstorm" autoFocus placeholder="Write anything. Premises, angles, tags, a rant that might be a joke." className="min-h-[55dvh] text-lg leading-relaxed" value={content} onChange={(e) => edit(setContent)(e.target.value)} />
          ) : (
            <InkCanvas strokes={pageInk} page={page} onChange={(next) => editInk((all) => replacePage(all, page, next))} tool={tool} color={pen.color} size={pen.size}
              fingerDraws={finger} onPencil={onPencil} zoom={zoom} onZoom={setZoom} />
          )}
        </div>
      </main>
    </div>
  )
}

export function SessionPage() {
  const { sessionId = '' } = useParams()
  const [params] = useSearchParams()
  const list = useSessionList()
  const session = useSession(sessionId)
  const summary = list.data?.find((s) => s.id === sessionId)
  // Offline as soon as the app knows, not only once a waiting download has paused.
  const offline = !useOnline() || session.fetchStatus === 'paused'
  const wait = <div className="p-8"><Spinner /></div>
  // Once open, the session stays open: a refresh in the background must never swap the page
  // you're writing on for a spinner (that would lose the zoom and the undo history).
  const [opened, setOpened] = useState<string | null>(null)
  // key: opening a different session starts a fresh workspace instead of reusing the old state.
  const workspace = <Workspace key={sessionId} id={sessionId} start={session.data ?? undefined} technique={params.get('technique')} />
  if (opened === sessionId) return workspace
  if (session.data === undefined) {
    // Never open an empty editor over a session whose ink isn't here: its autosave would wipe the
    // pages. A session that isn't in the list (or a list we can't load) is one just started.
    if (offline && (summary || !list.data)) return <NotOnDevice />
    if (session.isError) return <NotOnDevice failed onRetry={() => void session.refetch()} />
    if (!offline) return wait
  }
  // A copy older than the list says: wait for the fresh one rather than edit over it.
  if (session.data && summary && session.data.updated_at !== summary.updated_at && session.isFetching) return wait
  setOpened(sessionId) // React re-renders straight away, and from then on it stays open
  return workspace
}

function NotOnDevice({ failed, onRetry }: { failed?: boolean; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-xl p-8">
      <EmptyState title={failed ? "Couldn't open this session" : "This session isn't on this device yet"}
        action={<Link to="/brainstorm" className="text-tape hover:underline">Back to Brainstorm</Link>}>
        {failed ? (
          <button type="button" onClick={onRetry} className="text-dim underline hover:text-paper">Try again</button>
        ) : 'Open it once with signal and it stays here for offline.'}
      </EmptyState>
    </div>
  )
}
