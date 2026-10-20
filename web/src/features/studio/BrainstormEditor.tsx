/** The writing surface: title, free text with word count, session timer, save, and history. */
import { Pause, Play, Plus, RotateCcw, Save } from 'lucide-react'
import { useState } from 'react'
import { newId } from '../../api/client'
import { useBrainstormActions } from '../../api/shows'
import type { Bit, Brainstorm } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { clock } from '../../lib/duration'
import { HistoryPanel } from './HistoryPanel'
import { useTimer } from './useTimer'

interface Props {
  bit: Bit
  brainstorms: Brainstorm[]
  historyOpen: boolean
  onCloseHistory: () => void
}

export function BrainstormEditor({ bit, brainstorms, historyOpen, onCloseHistory }: Props) {
  const [id, setId] = useState(newId)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const timer = useTimer()
  const actions = useBrainstormActions()
  const { toast, confirm } = useFeedback()
  const current = brainstorms.find((b) => b.id === id)
  const past = brainstorms.filter((b) => b.id !== id)
  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  const startNew = () => {
    setId(newId())
    setTitle('')
    setContent('')
    timer.reset()
  }
  const load = (b: Brainstorm) => {
    setId(b.id)
    setTitle(b.title)
    setContent(b.content)
    timer.load(b.timer_seconds)
    onCloseHistory()
  }
  const save = () =>
    actions.save.mutate(
      { id, input: { bit_id: bit.id, title, content, timer_seconds: timer.seconds } },
      { onSuccess: () => toast('Brainstorm saved'), onError: (e) => toast(`Not saved: ${e.message}`) },
    )
  const removeBrainstorm = async (b: Brainstorm) => {
    if (await confirm({ title: 'Delete this brainstorm?', message: 'All its versions go too.', confirmLabel: 'Delete', danger: true })) {
      actions.remove.mutate(b.id)
      if (b.id === id) startNew()
    }
  }

  const history = (
    <HistoryPanel
      current={current}
      past={past}
      onLoadVersion={(v) => { setTitle(v.title); setContent(v.content); onCloseHistory() }}
      onDeleteVersion={(v) => actions.removeVersion.mutate(v.id)}
      onLoadBrainstorm={load}
      onDeleteBrainstorm={removeBrainstorm}
    />
  )

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="rounded-2xl bg-panel p-4 ring-1 ring-line">
          <p className="text-xs font-medium tracking-wide text-faint uppercase">Working on</p>
          <p className="mt-1.5 leading-snug">{bit.setup}</p>
          {bit.punchline && <p className="mt-1 leading-snug text-accent/90">{bit.punchline}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-panel py-1 pr-1 pl-3 ring-1 ring-line">
            <span className={`font-display text-xl tabular ${timer.running ? 'text-accent' : 'text-text'}`} aria-label="Session time">{clock(timer.seconds)}</span>
            {timer.running ? (
              <IconButton label="Pause timer" onClick={timer.pause}><Pause size={18} /></IconButton>
            ) : (
              <IconButton label="Start timer" onClick={timer.start}><Play size={18} /></IconButton>
            )}
            <IconButton label="Reset timer" onClick={timer.reset}><RotateCcw size={16} /></IconButton>
          </div>
          <span className="text-sm text-faint tabular">{words} words</span>
          <div className="ml-auto flex gap-2">
            <Button icon={<Plus size={16} />} onClick={startNew}>New</Button>
            <Button variant="primary" icon={<Save size={16} />} onClick={save} disabled={actions.save.isPending}>Save</Button>
          </div>
        </div>
        <Input aria-label="Brainstorm title" placeholder="Title this session…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea aria-label="Brainstorm" placeholder="Write freely. Alternate punchlines, tags, act-outs, anything." className="min-h-[50dvh] text-[17px] sm:text-base" value={content} onChange={(e) => setContent(e.target.value)} />
        {current && <p className="text-xs text-faint">{current.versions.length} version{current.versions.length === 1 ? '' : 's'} saved</p>}
      </div>
      <aside className="hidden w-72 shrink-0 lg:block">{history}</aside>
      <Modal open={historyOpen} onOpenChange={(o) => !o && onCloseHistory()} title="History">{history}</Modal>
    </div>
  )
}
