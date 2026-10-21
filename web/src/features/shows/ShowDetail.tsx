/** One show, read back: with Edit and Delete, its LPM if counted, and what you learned there. */
import { GraduationCap, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { useCraftNotes } from '../../api/craft'
import { useLogActions } from '../../api/shows'
import type { PerformanceLog } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Stars } from '../../components/ui/bits'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { long } from '../../lib/duration'
import { formatDateTime } from '../../lib/time'
import { formatLpm, lpm } from './lpm'

export function ShowDetail({ log, topics, onClose, onEdit }: { log: PerformanceLog; topics: string; onClose: () => void; onEdit: () => void }) {
  const { remove } = useLogActions()
  const { confirm, toast } = useFeedback()
  const { data: craft = [] } = useCraftNotes()
  const lessons = craft.filter((n) => n.performance_log_id === log.id)
  const score = lpm(log.laughs, log.duration_seconds)
  const onDelete = async () => {
    if (!(await confirm({ title: 'Delete this show?', message: `${log.venue_name}, ${formatDateTime(log.performed_at)}`, confirmLabel: 'Delete show', danger: true }))) return
    remove.mutate(log.id, { onSuccess: () => toast('Show deleted') })
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
          <li><Link to={`/craft/new?show=${log.id}&area=stage`} className="inline-flex items-center gap-2 text-sm text-dim hover:text-paper"><Plus size={15} />Add a lesson</Link></li>
        </ul>
      </div>
    </Modal>
  )
}
