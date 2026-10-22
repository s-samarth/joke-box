/** A way into brainstorming from Today: start a session, or pick up the last one. */
import { PenLine } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { newId } from '../../api/client'
import { useSessions } from '../../api/sessions'
import { SectionHead } from '../../components/ui/pieces'
import { sessionName } from '../brainstorm/sessionMeta'

export function TodayBrainstorm() {
  const { data: sessions = [] } = useSessions()
  const last = sessions[0]
  const navigate = useNavigate()
  return (
    <section className="mt-12">
      <SectionHead title="Brainstorm">
        <Link to="/brainstorm" className="text-sm text-dim hover:text-paper">{sessions.length ? `All ${sessions.length}` : 'Open'}</Link>
      </SectionHead>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => navigate(`/brainstorm/${newId()}`)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink-2 px-4 font-medium ring-1 ring-rule hover:bg-ink-3">
          <PenLine size={18} className="text-tape" /> Start a session
        </button>
        {last && (
          <Link to={`/brainstorm/${last.id}`} className="flex h-12 min-w-0 flex-1 items-center rounded-xl px-4 text-dim ring-1 ring-rule hover:text-paper">
            <span className="truncate">Continue: {sessionName(last)}</span>
          </Link>
        )}
      </div>
    </section>
  )
}
