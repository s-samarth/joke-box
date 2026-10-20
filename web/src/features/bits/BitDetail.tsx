/** Read-only view of a bit, with its brainstorms expandable inline. */
import { ChevronDown, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTopics } from '../../api/library'
import { useBrainstorms } from '../../api/shows'
import type { Bit } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Flames, TypeChip } from '../../components/ui/bits'
import { Modal } from '../../components/ui/Modal'
import { CLEAN_LABELS, displayTypes, strengthLabel } from '../../lib/bitMeta'
import { long } from '../../lib/duration'
import { formatDateTime } from '../../lib/time'

interface Props {
  bit: Bit
  onClose: () => void
  onEdit: () => void
  onStudio: () => void
  onDelete: () => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

export function BitDetail({ bit, onClose, onEdit, onStudio, onDelete }: Props) {
  const { data: topics = [] } = useTopics()
  const { data: brainstorms = [] } = useBrainstorms()
  const [openId, setOpenId] = useState<string | null>(null)
  const topic = topics.find((t) => t.id === bit.topic_id)
  const subtopic = topic?.subtopics.find((s) => s.id === bit.subtopic_id)
  const linked = brainstorms.filter((b) => b.bit_id === bit.id)

  return (
    <Modal
      open
      wide
      onOpenChange={(open) => !open && onClose()}
      title="Bit details"
      footer={
        <>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={onDelete} className="mr-auto">Delete</Button>
          <Button icon={<Sparkles size={16} />} onClick={onStudio}>Studio</Button>
          <Button variant="primary" icon={<Pencil size={16} />} onClick={onEdit}>Edit</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5">{displayTypes(bit.types).map((t) => <TypeChip key={t} name={t} />)}</div>
        <div className="space-y-3">
          <p className="font-display text-xl leading-snug select-text">{bit.setup}</p>
          {bit.punchline && <p className="text-lg leading-snug text-accent select-text">{bit.punchline}</p>}
          {bit.tag_lines.length > 0 && (
            <ol className="space-y-1.5 border-l-2 border-accent/30 pl-3 text-muted">
              {bit.tag_lines.map((line, i) => <li key={i} className="select-text">{line}</li>)}
            </ol>
          )}
        </div>
        <div className="rounded-2xl bg-ink/60 px-4 ring-1 ring-line">
          <Row label="Topic">{topic?.name ?? '—'}{subtopic && ` › ${subtopic.name}`}</Row>
          <Row label="Status">{bit.status ?? '—'}</Row>
          <Row label="Strength"><span className="inline-flex items-center gap-2"><Flames strength={bit.strength} /> {strengthLabel(bit.strength)}</span></Row>
          <Row label="Duration"><span className="tabular">{long(bit.duration_seconds)}</span></Row>
          {bit.clean_rating && <Row label="Clean rating">{CLEAN_LABELS[bit.clean_rating]}</Row>}
          {bit.language && <Row label="Language">{bit.language}</Row>}
          {bit.hashtags.length > 0 && <Row label="Hashtags">{bit.hashtags.join(' ')}</Row>}
          <Row label="Updated">{formatDateTime(bit.updated_at)}</Row>
        </div>
        {bit.comments && <p className="rounded-2xl bg-ink/60 p-4 text-sm whitespace-pre-wrap text-muted ring-1 ring-line select-text">{bit.comments}</p>}
        <section className="space-y-2">
          <h3 className="text-xs font-medium tracking-wide text-muted uppercase">Brainstorms ({linked.length})</h3>
          {linked.length === 0 && <p className="text-sm text-faint">None yet. Open the Studio to start one.</p>}
          {linked.map((b) => (
            <div key={b.id} className="rounded-2xl ring-1 ring-line">
              <button type="button" onClick={() => setOpenId(openId === b.id ? null : b.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm">
                <span className="font-medium">{b.title || 'Untitled'}</span>
                <span className="flex items-center gap-2 text-xs text-faint">{formatDateTime(b.updated_at)}<ChevronDown size={16} className={openId === b.id ? 'rotate-180' : ''} /></span>
              </button>
              {openId === b.id && <p className="border-t border-line px-4 py-3 text-sm whitespace-pre-wrap text-muted select-text">{b.content || 'Empty'}</p>}
            </div>
          ))}
        </section>
      </div>
    </Modal>
  )
}
