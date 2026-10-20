/** One show, read back: with Edit and Delete. */
import { useLogActions } from '../../api/shows'
import type { PerformanceLog } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Stars } from '../../components/ui/bits'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { long } from '../../lib/duration'
import { formatDateTime } from '../../lib/time'

export function ShowDetail({ log, topics, onClose, onEdit }: { log: PerformanceLog; topics: string; onClose: () => void; onEdit: () => void }) {
  const { remove } = useLogActions()
  const { confirm, toast } = useFeedback()
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
      {log.notes && <p className="mt-5 leading-relaxed whitespace-pre-wrap text-paper/90">{log.notes}</p>}
    </Modal>
  )
}
