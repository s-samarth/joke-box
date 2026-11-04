/**
 * All your free brainstorm sessions, newest first, searchable by title and typed words (?q=;
 * handwriting can't be searched), and buttons to start one, plain or with a technique.
 */
import { GraduationCap, Plus, Search, Trash2 } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { newId } from '../../api/client'
import { useCraftNotes } from '../../api/craft'
import { useDeleteSession, useSessionList } from '../../api/sessions'
import { Button, IconButton } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { EmptyState, PageHead, Spinner } from '../../components/ui/pieces'
import { useFeedback } from '../../components/ui/feedbackContext'
import { clock } from '../../lib/duration'
import { matchesWords } from '../../lib/search'
import { formatDate } from '../../lib/time'
import { sessionName, sessionSummary } from './sessionMeta'

export function BrainstormPage() {
  const { data: sessions, isPending } = useSessionList()
  const remove = useDeleteSession()
  const navigate = useNavigate()
  const { confirm, toast } = useFeedback()
  const { data: notes = [] } = useCraftNotes()
  const techniques = notes.filter((n) => n.behaviour === 'technique')
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const shown = (sessions ?? []).filter((s) => matchesWords(query, [s.title, s.content]))
  const setQuery = (q: string) => setParams((p) => { if (q) p.set('q', q); else p.delete('q'); return p }, { replace: true })
  const start = (technique?: string) => navigate(`/brainstorm/${newId()}${technique ? `?technique=${technique}` : ''}`)

  const onDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete this session?', message: 'It goes to the Trash for 30 days.', confirmLabel: 'Delete session', danger: true }))) return
    remove.mutate(id, { onError: (e) => toast(`Not deleted: ${e.message}`) })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Brainstorm">
        <Button variant="tape" small icon={<Plus size={16} />} onClick={() => start()}>New session</Button>
      </PageHead>
      <p className="-mt-2 mb-6 text-dim">Daily writing, not tied to one joke. Type or handwrite against the timer, and link the jokes and observations it touches.</p>
      {techniques.length > 0 && (
        <section className="mb-8" aria-label="Start with a technique">
          <p className="mb-2 text-sm text-dim">Start with a technique</p>
          <div className="flex flex-wrap gap-2">
            {techniques.map((t) => (
              <button key={t.id} type="button" onClick={() => start(t.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink-3 px-3 text-sm hover:bg-ink-4">
                <GraduationCap size={15} className="text-tape" /> {t.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {isPending && !sessions ? (
        <div className="py-10"><Spinner /></div>
      ) : !sessions?.length ? (
        <EmptyState title="No sessions yet" action={<Button variant="tape" onClick={() => start()}>Start writing</Button>}>
          Start the timer and write whatever comes. Sessions save as you go.
        </EmptyState>
      ) : (
        <>
        <div className="relative mb-3">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <Input type="search" aria-label="Search brainstorms" placeholder="Search titles and typed words" className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {shown.length === 0 && <p className="py-6 text-dim">No session matches. Handwriting can't be searched, only titles and typed words.</p>}
        <ul className="divide-y divide-rule border-y border-rule">
          {shown.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <Link to={`/brainstorm/${s.id}`} className="min-w-0 flex-1 py-3.5 hover:text-tape">
                <span className="block truncate text-[17px]">{sessionName(s)}</span>
                <span className="block truncate text-sm text-faint">
                  {[formatDate(s.updated_at), s.timer_seconds ? clock(s.timer_seconds) : null, sessionSummary(s)].filter(Boolean).join(', ')}
                </span>
              </Link>
              <IconButton label="Delete session" onClick={() => onDelete(s.id)}><Trash2 size={16} /></IconButton>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  )
}
