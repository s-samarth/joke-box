/**
 * A joke, read in full without leaving the page you're on (used while building a set).
 * Read-only on purpose: "Edit joke" goes to the joke's own page, where every change saves.
 */
import { Check, PenLine, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useJokes, useTopics } from '../../api/library'
import type { Joke } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { StrengthTicks, TypeLabel } from '../../components/ui/pieces'
import { Modal } from '../../components/ui/Modal'
import { CLEAN_LABELS, displayTypes, strengthLabel, topicName } from '../../lib/jokeMeta'
import { clock } from '../../lib/duration'

interface Props {
  joke: Joke
  onClose: () => void
  /** Shown as "Add to set" when given; "In the set" once it's there. */
  onAdd?: () => void
  inSet?: boolean
}

export function JokePeek({ joke, onClose, onAdd, inSet }: Props) {
  const { data: topics = [] } = useTopics()
  const topic = topics.find((t) => t.id === joke.topic_id)
  const subtopic = topic?.subtopics.find((s) => s.id === joke.subtopic_id)
  const { data: jokes = [] } = useJokes()
  const before = joke.follows_id ? jokes.find((b) => b.id === joke.follows_id) : undefined
  const rows: [string, ReactNode][] = [
    ['Strength', <span key="s" className="inline-flex items-center gap-2"><StrengthTicks strength={joke.strength} />{strengthLabel(joke.strength)}</span>],
    ['Runs for', <span key="d" className="tabular">{joke.duration_seconds ? clock(joke.duration_seconds) : 'Not timed'}</span>],
    ['Type', <span key="t" className="inline-flex flex-wrap justify-end gap-x-3">{displayTypes(joke.types).map((t) => <TypeLabel key={t} name={t} />)}</span>],
    ...(joke.follows_id ? [['Follows', <span key="f" className="line-clamp-1">{before?.setup ?? 'A joke in the Trash'}</span>] as [string, ReactNode]] : []),
    ['Filed under', [topicName(topic), subtopic?.name].filter(Boolean).join(' / ')],
    ...(joke.status ? [['Status', joke.status] as [string, ReactNode]] : []),
    ...(joke.clean_rating ? [['Clean rating', CLEAN_LABELS[joke.clean_rating]] as [string, ReactNode]] : []),
    ...(joke.language ? [['Language', joke.language] as [string, ReactNode]] : []),
    ...(joke.hashtags.length ? [['Hashtags', joke.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')] as [string, ReactNode]] : []),
  ]

  const footer = (
    <>
      <Link to={`/jokes/${joke.id}`} className="mr-auto inline-flex h-10 items-center gap-2 rounded-lg px-3 text-[15px] text-dim hover:bg-ink-3 hover:text-paper">
        <PenLine size={16} /> Edit joke
      </Link>
      {onAdd && (inSet
        ? <span className="inline-flex h-10 items-center gap-2 px-3 text-[15px] text-faint"><Check size={16} /> In the set</span>
        : <Button variant="tape" icon={<Plus size={18} />} onClick={() => { onAdd(); onClose() }}>Add to set</Button>)}
    </>
  )

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="The joke" description={topicName(topic)} footer={footer} wide>
      <p className="text-[22px] leading-snug font-medium whitespace-pre-wrap">{joke.setup}</p>
      {joke.punchline && <p className="mt-3 text-[22px] leading-snug whitespace-pre-wrap text-tape">{joke.punchline}</p>}
      {joke.tag_lines.filter((t) => t.trim()).map((t, i) => (
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
      {joke.comments && (
        <div className="mt-5">
          <h3 className="text-sm text-dim">Notes</h3>
          <p className="mt-1 leading-relaxed whitespace-pre-wrap text-paper/90">{joke.comments}</p>
        </div>
      )}
    </Modal>
  )
}
