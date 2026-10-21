/**
 * Rewrite: a quiet full-screen page for reworking one bit against the clock. The original stays
 * pinned at the top, the timer runs while you write, and every save keeps a version.
 */
import { History, ListChecks, Pause, Play, Plus, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { newId } from '../../api/client'
import { useBits } from '../../api/library'
import { useBrainstormActions, useBrainstorms } from '../../api/shows'
import type { Bit, Brainstorm } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/bits'
import { GrowingText } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { clock } from '../../lib/duration'
import { CraftSheet } from '../craft/CraftSheet'
import { RewriteHistory } from './RewriteHistory'
import { useTimer } from './useTimer'

function Workspace({ bit, sessions, startId }: { bit: Bit; sessions: Brainstorm[]; startId: string | null }) {
  const start = sessions.find((s) => s.id === startId)
  const [id, setId] = useState(() => start?.id ?? newId())
  const [title, setTitle] = useState(start?.title ?? '')
  const [content, setContent] = useState(start?.content ?? '')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const timer = useTimer(start?.timer_seconds ?? 0)
  const actions = useBrainstormActions()
  const { toast, confirm } = useFeedback()
  const current = sessions.find((s) => s.id === id)
  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  const open = (b?: Brainstorm) => {
    setId(b?.id ?? newId())
    setTitle(b?.title ?? '')
    setContent(b?.content ?? '')
    timer.load(b?.timer_seconds ?? 0)
    setHistoryOpen(false)
  }
  const save = () =>
    actions.save.mutate(
      { id, input: { bit_id: bit.id, title, content, timer_seconds: timer.seconds } },
      { onSuccess: (b) => toast(`Version ${b.versions.length} saved`), onError: (e) => toast(`Not saved: ${e.message}`) },
    )
  const deleteSession = async (b: Brainstorm) => {
    if (!(await confirm({ title: 'Delete this session?', message: 'All of its versions go too.', confirmLabel: 'Delete session', danger: true }))) return
    actions.remove.mutate(b.id)
    if (b.id === id) open()
  }
  const history = (
    <RewriteHistory current={current} others={sessions.filter((s) => s.id !== id)} onOpenSession={open} onDeleteSession={deleteSession}
      onLoadVersion={(v) => { setTitle(v.title); setContent(v.content); setHistoryOpen(false) }} onDeleteVersion={(v) => actions.removeVersion.mutate(v.id)} />
  )

  return (
    <div className="pt-safe min-h-dvh">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-rule bg-ink/95 px-3 py-2 backdrop-blur sm:px-6">
        <Link to={`/bits/${bit.id}`} aria-label="Close rewrite" className="inline-flex size-10 items-center justify-center rounded-lg text-dim hover:bg-ink-3 hover:text-paper"><X size={20} /></Link>
        <button type="button" onClick={timer.running ? timer.pause : timer.start} className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 ${timer.running ? 'bg-tape text-tape-ink' : 'bg-ink-3'}`} aria-label={timer.running ? 'Pause timer' : 'Start timer'}>
          {timer.running ? <Pause size={16} /> : <Play size={16} />}
          <span className="headline text-xl tabular">{clock(timer.seconds)}</span>
        </button>
        <IconButton label="Reset timer" onClick={timer.reset}><RotateCcw size={16} /></IconButton>
        <span className="hidden text-sm text-faint tabular sm:inline">{words} words</span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Checklists" onClick={() => setChecking(true)}><ListChecks size={18} /></IconButton>
          <IconButton label="New session" onClick={() => open()}><Plus size={18} /></IconButton>
          <IconButton label="History" onClick={() => setHistoryOpen(true)} className="lg:hidden"><History size={18} /></IconButton>
          <Button variant="tape" onClick={save} disabled={actions.save.isPending}>Save<span className="hidden sm:inline">&nbsp;version</span></Button>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-10 px-5 sm:px-8">
        <main className="mx-auto min-w-0 max-w-2xl flex-1 py-8">
          <div className="border-l-2 border-tape/60 pl-4 text-dim">
            <p className="leading-snug">{bit.setup}</p>
            {bit.punchline && <p className="mt-1 leading-snug text-tape/80">{bit.punchline}</p>}
          </div>
          <GrowingText aria-label="Session title" placeholder="Name this session (optional)" className="headline mt-8 text-3xl" value={title} onChange={(e) => setTitle(e.target.value)} />
          <GrowingText aria-label="Rewrite" autoFocus placeholder="Write it again. Other punches, tags, an act-out, a new angle." className="mt-4 min-h-[50dvh] text-lg leading-relaxed" value={content} onChange={(e) => setContent(e.target.value)} />
          <p className="text-sm text-faint tabular sm:hidden">{words} words</p>
        </main>
        <aside className="hidden w-72 shrink-0 py-8 lg:block">{history}</aside>
      </div>
      <Modal open={historyOpen} onOpenChange={setHistoryOpen} title="History">{history}</Modal>
      <CraftSheet open={checking} onOpenChange={setChecking} title="Checklists" areas={['rewriting', 'writing']} kinds={['checklist']}
        empty="No checklists for rewriting yet." />
    </div>
  )
}

export function RewritePage() {
  const { bitId } = useParams()
  const [params] = useSearchParams()
  const { data: bits } = useBits()
  const { data: brainstorms, isPending } = useBrainstorms()
  const bit = bits?.find((b) => b.id === bitId)
  if (!bit || (isPending && !brainstorms)) return <div className="p-8"><Spinner /></div>
  return <Workspace bit={bit} sessions={(brainstorms ?? []).filter((b) => b.bit_id === bit.id)} startId={params.get('session')} />
}
