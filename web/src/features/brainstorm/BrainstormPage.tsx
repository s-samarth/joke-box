/** All your free brainstorm sessions, newest first, and a button to start a new one. */
import { Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { newId } from '../../api/client'
import { useDeleteSession, useSessions } from '../../api/sessions'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState, PageHead, Spinner } from '../../components/ui/bits'
import { useFeedback } from '../../components/ui/feedbackContext'
import { clock } from '../../lib/duration'
import { formatDate } from '../../lib/time'
import { sessionName, sessionSummary } from './sessionMeta'

export function BrainstormPage() {
  const { data: sessions, isPending } = useSessions()
  const remove = useDeleteSession()
  const navigate = useNavigate()
  const { confirm, toast } = useFeedback()
  const start = () => navigate(`/brainstorm/${newId()}`)

  const onDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete this session?', confirmLabel: 'Delete session', danger: true }))) return
    remove.mutate(id, { onError: (e) => toast(`Not deleted: ${e.message}`) })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Brainstorm">
        <Button variant="tape" small icon={<Plus size={16} />} onClick={start}>New session</Button>
      </PageHead>
      <p className="-mt-2 mb-6 text-dim">Daily writing, not tied to one joke. Type or handwrite against the timer, and link the jokes and observations it touches.</p>

      {isPending && !sessions ? (
        <div className="py-10"><Spinner /></div>
      ) : !sessions?.length ? (
        <EmptyState title="No sessions yet" action={<Button variant="tape" onClick={start}>Start writing</Button>}>
          Start the timer and write whatever comes. Sessions save as you go.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {sessions.map((s) => (
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
      )}
    </div>
  )
}
