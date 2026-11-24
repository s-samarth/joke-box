/**
 * Rewrite: a quiet full-screen page for reworking one joke against the clock. The original stays
 * pinned at the top, with where it came from (observations, voice notes) a tap below it; the
 * timer runs while you write, and every save keeps a version.
 */
import { History, ListChecks, MoreHorizontal, Pause, Play, Plus, RotateCcw, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { writeText } from '../capture/deviceDraft'
import { openRewrite, rewriteKey, type RewriteText } from './rewriteDraft'
import { useJokes } from '../../api/library'
import { useBrainstormActions, useBrainstorms } from '../../api/shows'
import type { Joke, Brainstorm } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/pieces'
import { GrowingText } from '../../components/ui/Field'
import { Dropdown } from '../../components/ui/Menu'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { clock } from '../../lib/duration'
import { CraftSheet } from '../craft/CraftSheet'
import { JokeOrigins } from './JokeOrigins'
import { RewriteHistory } from './RewriteHistory'
import { useHasOrigins } from './useHasOrigins'
import { useTimer } from './useTimer'
import { announceSave } from '../../lib/announce'

function Workspace({ joke, sessions, startId }: { joke: Joke; sessions: Brainstorm[]; startId: string | null }) {
  const start = sessions.find((s) => s.id === startId)
  const navigate = useNavigate()
  const [key, setKey] = useState(() => rewriteKey(joke.id, start?.id))
  const [draft, setDraft] = useState(() => openRewrite(key, start))
  const { id, title, content } = draft
  const activeId = useRef(id)
  const [base, setBase] = useState({ title: start?.title ?? '', content: start?.content ?? '' })
  const [historyOpen, setHistoryOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const timer = useTimer(start?.timer_seconds ?? 0)
  const actions = useBrainstormActions()
  const { toast, confirm } = useFeedback()
  const current = sessions.find((s) => s.id === id)
  const hasOrigins = useHasOrigins(joke)
  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  const dirty = title !== base.title || content !== base.content
  const edit = (next: RewriteText) => {
    const changed = actions.save.isPending || next.title !== base.title || next.content !== base.content
    writeText(key, changed ? JSON.stringify(next) : '')
    setDraft(next)
  }
  const discard = () => confirm({ title: 'Discard unsaved changes?', message: 'Your saved versions will stay in History.', confirmLabel: 'Discard changes', danger: true })
  const close = async () => {
    if (dirty && !writeText(key, JSON.stringify(draft)) && !(await discard())) return
    navigate(`/jokes/${joke.id}`)
  }
  const open = async (b?: Brainstorm, deleted = false) => {
    const next = rewriteKey(joke.id, b?.id)
    if (!deleted && dirty && (next === key || !writeText(key, JSON.stringify(draft)))) {
      if (!(await discard())) return
      writeText(key, '')
    }
    if (deleted) writeText(key, '')
    setKey(next)
    const opened = openRewrite(next, b)
    activeId.current = opened.id
    setDraft(opened)
    if (startId !== (b?.id ?? null)) navigate(`/jokes/${joke.id}/rewrite${b ? '?session=' + b.id : ''}`, { replace: true })
    setBase({ title: b?.title ?? '', content: b?.content ?? '' })
    timer.load(b?.timer_seconds ?? 0)
    setHistoryOpen(false)
  }
  const save = () => {
    const saving = actions.save.mutateAsync({ id, input: { joke_id: joke.id, title, content, timer_seconds: timer.seconds } })
    saving.then((b) => {
      if (activeId.current === id) setBase({ title, content })
      toast(`Version ${b.versions.length} saved`)
    }, (e: Error) => toast(`Not saved: ${e.message}`))
    announceSave(saving, toast, null) // says so if it's waiting; the version number comes when it lands
  }
  const deleteSession = async (b: Brainstorm) => {
    if (!(await confirm({ title: 'Delete this session?', message: 'It goes to the Trash for 30 days, with all its versions.', confirmLabel: 'Delete session', danger: true }))) return
    actions.remove.mutate(b.id)
    writeText(rewriteKey(joke.id, b.id), '')
    if (b.id === id) void open(undefined, true)
  }
  const history = (
    <RewriteHistory current={current} others={sessions.filter((s) => s.id !== id)} onOpenSession={open} onDeleteSession={deleteSession}
      onLoadVersion={(v) => { edit({ id, title: v.title, content: v.content }); setHistoryOpen(false) }} onDeleteVersion={(v) => actions.removeVersion.mutate(v.id)} />
  )

  return (
    <div className="pt-safe min-h-dvh">
      <header className="sticky top-0 z-10 flex items-center gap-1.5 sm:gap-2 border-b border-rule bg-ink/95 px-3 py-2 backdrop-blur sm:px-6">
        <button type="button" onClick={() => void close()} aria-label="Close rewrite" className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-dim hover:bg-ink-3 hover:text-paper"><X size={20} /></button>
        <button type="button" onClick={timer.running ? timer.pause : timer.start} className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 ${timer.running ? 'bg-tape text-tape-ink' : 'bg-ink-3'}`} aria-label={timer.running ? 'Pause timer' : 'Start timer'}>
          {timer.running ? <Pause size={16} /> : <Play size={16} />}
          <span className="headline text-xl tabular">{clock(timer.seconds)}</span>
        </button>
        <IconButton label="Reset timer" onClick={timer.reset}><RotateCcw size={16} /></IconButton>
        <span className="hidden text-sm text-faint tabular sm:inline">{words} words</span>
        <div className="ml-auto flex items-center gap-1">
          {/* A phone has room for the timer and Save; the rest sit behind ⋯ there. */}
          <div className="hidden items-center gap-1 sm:flex">
            <IconButton label="Checklists" onClick={() => setChecking(true)}><ListChecks size={18} /></IconButton>
            <IconButton label="New session" onClick={() => open()}><Plus size={18} /></IconButton>
            <IconButton label="History" onClick={() => setHistoryOpen(true)} className="lg:hidden"><History size={18} /></IconButton>
          </div>
          <div className="sm:hidden">
            <Dropdown trigger={<IconButton label="More"><MoreHorizontal size={18} /></IconButton>} items={[
              { label: 'Checklists', icon: <ListChecks size={16} />, onSelect: () => setChecking(true) },
              { label: 'New session', icon: <Plus size={16} />, onSelect: () => open() },
              { label: 'History', icon: <History size={16} />, onSelect: () => setHistoryOpen(true) },
            ]} />
          </div>
          <Button variant="tape" onClick={save} disabled={actions.save.isPending && !actions.save.isPaused}>Save<span className="hidden sm:inline">&nbsp;version</span></Button>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-10 px-5 sm:px-8">
        <main className="mx-auto min-w-0 max-w-2xl flex-1 py-8">
          <div className="border-l-2 border-tape/60 pl-4 text-dim">
            <p className="leading-snug">{joke.setup}</p>
            {joke.punchline && <p className="mt-1 leading-snug text-tape/80">{joke.punchline}</p>}
          </div>
          {hasOrigins && (
            <details className="mt-3 rounded-lg bg-ink-2 px-4 py-2 ring-1 ring-rule">
              <summary className="cursor-pointer py-1 text-sm text-dim">Where it came from</summary>
              <div className="pt-2 pb-2"><JokeOrigins joke={joke} /></div>
            </details>
          )}
          <GrowingText aria-label="Session title" placeholder="Name this session (optional)" className="headline mt-8 text-3xl" value={title} onChange={(e) => edit({ ...draft, title: e.target.value })} />
          <GrowingText aria-label="Rewrite" autoFocus placeholder="Write it again. Other punches, tags, an act-out, a new angle." className="mt-4 min-h-[50dvh] text-lg leading-relaxed" value={content} onChange={(e) => edit({ ...draft, content: e.target.value })} />
          {dirty && <button type="button" className="text-sm text-dim underline" onClick={async () => {
            if (!(await discard())) return
            writeText(key, '')
            setDraft({ id, ...base })
          }}>Discard draft</button>}
          <p className="text-sm text-faint tabular sm:hidden">{words} words</p>
        </main>
        <aside className="hidden w-72 shrink-0 py-8 lg:block">{history}</aside>
      </div>
      <Modal open={historyOpen} onOpenChange={setHistoryOpen} title="History">{history}</Modal>
      <CraftSheet open={checking} onOpenChange={setChecking} title="Checklists" screen="rewrite" behaviours={['checklist']}
        empty="No checklists in the areas that show on Rewrite." />
    </div>
  )
}

export function RewritePage() {
  const { jokeId } = useParams()
  const [params] = useSearchParams()
  const { data: jokes } = useJokes()
  const { data: brainstorms, isPending } = useBrainstorms()
  const joke = jokes?.find((b) => b.id === jokeId)
  if (!joke || (isPending && !brainstorms)) return <div className="p-8"><Spinner /></div>
  const requested = params.get('session')
  if (requested && !brainstorms?.some((b) => b.id === requested && b.joke_id === joke.id)) {
    return <div className="p-8"><p>This rewrite is unavailable.</p><Link className="underline" to={`/jokes/${joke.id}`}>Back to joke</Link></div>
  }
  return <Workspace key={joke.id + ':' + (requested ?? 'new')} joke={joke} sessions={(brainstorms ?? []).filter((b) => b.joke_id === joke.id)} startId={requested} />
}
