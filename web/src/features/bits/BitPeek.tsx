/**
 * A bit, read in full without leaving the page you're on (used while building a set).
 * Read-only on purpose: "Edit bit" goes to the bit's own page, where every change saves.
 */
import { Check, PenLine, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useTopics } from '../../api/library'
import type { Bit } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { StrengthTicks, TypeLabel } from '../../components/ui/bits'
import { Modal } from '../../components/ui/Modal'
import { CLEAN_LABELS, displayTypes, strengthLabel, topicName } from '../../lib/bitMeta'
import { clock } from '../../lib/duration'

interface Props {
  bit: Bit
  onClose: () => void
  /** Shown as "Add to set" when given; "In the set" once it's there. */
  onAdd?: () => void
  inSet?: boolean
}

export function BitPeek({ bit, onClose, onAdd, inSet }: Props) {
  const { data: topics = [] } = useTopics()
  const topic = topics.find((t) => t.id === bit.topic_id)
  const subtopic = topic?.subtopics.find((s) => s.id === bit.subtopic_id)
  const rows: [string, ReactNode][] = [
    ['Strength', <span key="s" className="inline-flex items-center gap-2"><StrengthTicks strength={bit.strength} />{strengthLabel(bit.strength)}</span>],
    ['Runs for', <span key="d" className="tabular">{bit.duration_seconds ? clock(bit.duration_seconds) : 'Not timed'}</span>],
    ['Type', <span key="t" className="inline-flex flex-wrap justify-end gap-x-3">{displayTypes(bit.types).map((t) => <TypeLabel key={t} name={t} />)}</span>],
    ['Filed under', [topicName(topic), subtopic?.name].filter(Boolean).join(' / ')],
    ...(bit.status ? [['Status', bit.status] as [string, ReactNode]] : []),
    ...(bit.clean_rating ? [['Clean rating', CLEAN_LABELS[bit.clean_rating]] as [string, ReactNode]] : []),
    ...(bit.language ? [['Language', bit.language] as [string, ReactNode]] : []),
    ...(bit.hashtags.length ? [['Hashtags', bit.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')] as [string, ReactNode]] : []),
  ]

  const footer = (
    <>
      <Link to={`/bits/${bit.id}`} className="mr-auto inline-flex h-10 items-center gap-2 rounded-lg px-3 text-[15px] text-dim hover:bg-ink-3 hover:text-paper">
        <PenLine size={16} /> Edit bit
      </Link>
      {onAdd && (inSet
        ? <span className="inline-flex h-10 items-center gap-2 px-3 text-[15px] text-faint"><Check size={16} /> In the set</span>
        : <Button variant="tape" icon={<Plus size={18} />} onClick={() => { onAdd(); onClose() }}>Add to set</Button>)}
    </>
  )

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="The bit" description={topicName(topic)} footer={footer} wide>
      <p className="text-[22px] leading-snug font-medium whitespace-pre-wrap">{bit.setup}</p>
      {bit.punchline && <p className="mt-3 text-[22px] leading-snug whitespace-pre-wrap text-tape">{bit.punchline}</p>}
      {bit.tag_lines.filter((t) => t.trim()).map((t, i) => (
        <p key={i} className="mt-2 flex gap-3 text-lg leading-snug text-dim"><span className="text-tape" aria-hidden>+</span>{t}</p>
      ))}
      <dl className="mt-6 divide-y divide-rule border-y border-rule">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-3">
            <dt className="shrink-0 text-dim">{k}</dt>
            <dd className="min-w-0 text-right">{v}</dd>
          </div>
        ))}
      </dl>
      {bit.comments && (
        <div className="mt-5">
          <h3 className="text-sm text-dim">Notes</h3>
          <p className="mt-1 leading-relaxed whitespace-pre-wrap text-paper/90">{bit.comments}</p>
        </div>
      )}
    </Modal>
  )
}
