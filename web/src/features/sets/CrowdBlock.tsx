/**
 * Crowd work in a beat: the questions you'll ask the room, and a line for what they might say.
 * Plain text, nothing to link. "Have a reply" marks a question you've got something for.
 */
import { Plus, X } from 'lucide-react'
import { newId } from '../../api/client'
import type { SetEntry, SetQuestion } from '../../api/types'
import { GrowingText, Input } from '../../components/ui/Field'

type Crowd = Extract<SetEntry, { kind: 'crowd' }>

const small = 'inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-dim hover:bg-ink-3 hover:text-paper'
const remove = 'inline-flex size-8 pointer-coarse:size-11 shrink-0 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper'

export function CrowdBlock({ entry, onChange }: { entry: Crowd; onChange: (e: Crowd) => void }) {
  const setQ = (id: string, change: (q: SetQuestion) => SetQuestion) =>
    onChange({ ...entry, questions: entry.questions.map((q) => (q.id === id ? change(q) : q)) })
  return (
    <div className="space-y-3">
      <Input aria-label="What this crowd work is about" maxLength={200} placeholder="What it's about (Gym or reels?)" value={entry.title}
        onChange={(e) => onChange({ ...entry, title: e.target.value })} />
      {entry.questions.map((q, n) => (
        <div key={q.id} className="rounded-lg bg-ink-2 p-3">
          <div className="flex items-start gap-2">
            <GrowingText aria-label={`Question ${n + 1}`} maxLength={1000} placeholder="Your question to the room" value={q.text} className="flex-1 font-medium leading-snug"
              onChange={(e) => setQ(q.id, (x) => ({ ...x, text: e.target.value }))} />
            <button type="button" aria-pressed={q.has_reply} onClick={() => setQ(q.id, (x) => ({ ...x, has_reply: !x.has_reply }))}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${q.has_reply ? 'bg-ok/15 text-ok' : 'bg-amber/15 text-amber'}`}>
              {q.has_reply ? 'Have a reply' : 'No reply yet'}
            </button>
            <button type="button" className={remove} aria-label="Remove question" onClick={() => onChange({ ...entry, questions: entry.questions.filter((x) => x.id !== q.id) })}><X size={15} /></button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {q.replies.map((r) => (
              <li key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1 sm:flex">
                <Input aria-label="If they say" maxLength={300} placeholder="If they say…" value={r.when} className="h-9 text-sm sm:h-9 sm:basis-2/5"
                  onChange={(e) => setQ(q.id, (x) => ({ ...x, replies: x.replies.map((y) => (y.id === r.id ? { ...y, when: e.target.value } : y)) }))} />
                <span className="hidden text-faint sm:inline" aria-hidden>→</span>
                <Input aria-label="Your line" maxLength={2000} placeholder="→ your line" value={r.line} className="col-start-1 h-9 text-sm italic sm:h-9 sm:flex-1"
                  onChange={(e) => setQ(q.id, (x) => ({ ...x, replies: x.replies.map((y) => (y.id === r.id ? { ...y, line: e.target.value } : y)) }))} />
                <button type="button" className={`${remove} col-start-2 row-span-2 row-start-1`} aria-label="Remove reply" onClick={() => setQ(q.id, (x) => ({ ...x, replies: x.replies.filter((y) => y.id !== r.id) }))}><X size={15} /></button>
              </li>
            ))}
          </ul>
          <button type="button" className={`${small} mt-1`} onClick={() => setQ(q.id, (x) => ({ ...x, replies: [...x.replies, { id: newId(), when: '', line: '' }] }))}>
            <Plus size={14} /> Reply
          </button>
        </div>
      ))}
      <button type="button" className={small} onClick={() => onChange({ ...entry, questions: [...entry.questions, { id: newId(), text: '', has_reply: false, replies: [] }] })}>
        <Plus size={14} /> Question
      </button>
    </div>
  )
}
