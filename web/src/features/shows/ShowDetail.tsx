/** One show, read back: with Edit and Delete, its LPM if counted, how particular jokes went
 * (with any comment), and what you learned there. */
import { GraduationCap, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { useCraftNotes } from '../../api/craft'
import { useJokes } from '../../api/library'
import { useLogActions } from '../../api/shows'
import type { PerformanceLog } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Stars } from '../../components/ui/pieces'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { long } from '../../lib/duration'
import { formatDateTime } from '../../lib/time'
import { formatLpm, lpm } from './lpm'

const RESULT_LABEL = { killed: 'Killed', ok: 'OK', bombed: 'Bombed', none: 'Not rated' }
const RESULT_STYLE = { killed: 'text-tape', ok: 'text-paper', bombed: 'text-light', none: 'text-faint' }

export function ShowDetail({ log, topics, onClose, onEdit }: { log: PerformanceLog; topics: string; onClose: () => void; onEdit: () => void }) {
  const { remove } = useLogActions()
  const { confirm, toast } = useFeedback()
  const { data: craft = [] } = useCraftNotes()
  const { data: jokes = [] } = useJokes()
  const setupOf = new Map(jokes.map((j) => [j.id, j.setup]))
  const done = (log.jokes ?? []).filter((d) => setupOf.has(d.joke_id))
  const lessons = craft.filter((n) => n.performance_log_id === log.id)
  const score = lpm(log.laughs, log.duration_seconds)
  const onDelete = async () => {
    if (!(await confirm({ title: 'Delete this show?', message: `${log.venue_name}, ${formatDateTime(log.performed_at)}. It goes to the Trash for 30 days.`, confirmLabel: 'Delete show', danger: true }))) return
    remove.mutateAsync(log.id).catch((e: Error) => toast(`Show not deleted: ${e.message}`))
    toast('Show deleted')
    onClose()
  }
  const rows: [string, React.ReactNode][] = [
    ['How it went', <Stars key="s" rating={log.rating} size={16} />],
    ['On stage', long(log.duration_seconds)],
    ['In the room', `${log.audience_size} people`],
    ['Topics', topics || 'None noted'],
    ...(score === null ? [] : [['Laughs', formatLpm(score)] as [string, string]]),
  ]

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={log.venue_name} description={formatDateTime(log.performed_at)}
      footer={<><Button variant="danger" className="mr-auto" onClick={onDelete}>Delete</Button><Button variant="tape" onClick={onEdit}>Edit</Button></>}>
      <dl className="divide-y divide-rule border-y border-rule">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-dim">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      {done.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm text-dim">How particular jokes went</h3>
          <ol className="mt-1.5 space-y-1.5">
            {done.map((d) => (
              <li key={d.joke_id}>
                <div className="flex items-baseline justify-between gap-3">
                  <Link to={`/jokes/${d.joke_id}`} className="min-w-0 truncate hover:text-tape">{setupOf.get(d.joke_id)}</Link>
                  <span className={`shrink-0 text-sm ${RESULT_STYLE[d.result ?? 'none']}`}>{RESULT_LABEL[d.result ?? 'none']}</span>
                </div>
                {d.note && <p className="text-sm text-dim">{d.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {log.notes && (
        <div className="mt-5">
          <h3 className="text-sm text-dim">Remarks</h3>
          <p className="mt-1 leading-relaxed whitespace-pre-wrap text-paper/90">{log.notes}</p>
        </div>
      )}
      <div className="mt-5">
        <h3 className="text-sm text-dim">What you learned</h3>
        <ul className="mt-1.5 space-y-1">
          {lessons.map((n) => (
            <li key={n.id}><Link to={`/craft/${n.id}`} className="inline-flex items-center gap-2 hover:text-tape"><GraduationCap size={15} className="text-tape" />{n.title}</Link></li>
          ))}
          <li><Link to={`/craft/new?show=${log.id}&screen=stage`} className="inline-flex items-center gap-2 text-sm text-dim hover:text-paper"><Plus size={15} />Add a lesson</Link></li>
        </ul>
      </div>
    </Modal>
  )
}
