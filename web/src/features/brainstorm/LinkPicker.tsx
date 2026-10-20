/** Pick jokes and observations to link to a brainstorm session. Searches both at once. */
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useBits } from '../../api/library'
import { useObservations } from '../../api/notebook'
import { Input } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'

interface Props {
  bitIds: string[]
  observationIds: string[]
  onChange: (bitIds: string[], observationIds: string[]) => void
  onClose: () => void
}

const toggle = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
const SHOWN = 40

function Row({ on, text, sub, onClick }: { on: boolean; text: string; sub?: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" aria-pressed={on} onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-ink-3">
        <span className={`flex size-5 shrink-0 items-center justify-center rounded border ${on ? 'border-tape bg-tape text-tape-ink' : 'border-rule-strong'}`}>{on && <Check size={14} />}</span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2">{text}</span>
          {sub && <span className="block truncate text-sm text-faint">{sub}</span>}
        </span>
      </button>
    </li>
  )
}

export function LinkPicker({ bitIds, observationIds, onChange, onClose }: Props) {
  const [q, setQ] = useState('')
  const { data: bits = [] } = useBits()
  const { data: observations = [] } = useObservations()
  const needle = q.trim().toLowerCase()
  const match = (...texts: string[]) => !needle || texts.some((t) => t.toLowerCase().includes(needle))
  const jokes = bits.filter((b) => match(b.setup, b.punchline)).slice(0, SHOWN)
  const notes = observations.filter((o) => match(o.text)).slice(0, SHOWN)

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Link jokes and observations" wide>
      <Input type="search" placeholder="Search your jokes and observations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      <h3 className="mt-6 mb-1 text-sm text-dim">Jokes</h3>
      {jokes.length ? (
        <ul>{jokes.map((b) => <Row key={b.id} on={bitIds.includes(b.id)} text={b.setup} sub={b.punchline || undefined} onClick={() => onChange(toggle(bitIds, b.id), observationIds)} />)}</ul>
      ) : <p className="px-2 py-2 text-faint">No jokes match.</p>}
      <h3 className="mt-6 mb-1 text-sm text-dim">Observations</h3>
      {notes.length ? (
        <ul>{notes.map((o) => <Row key={o.id} on={observationIds.includes(o.id)} text={o.text} onClick={() => onChange(bitIds, toggle(observationIds, o.id))} />)}</ul>
      ) : <p className="px-2 py-2 text-faint">No observations match.</p>}
    </Modal>
  )
}
